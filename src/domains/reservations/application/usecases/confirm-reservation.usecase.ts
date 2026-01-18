import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  RESERVATION_REPOSITORY,
  POINTS_PORT,
  ReservationRepositoryPort,
  PointsPort,
  ReservationConfirmedEvent,
} from '../../domain';
import {
  IdempotencyRepository,
  IdempotencyScope,
} from '../../../points/outbound/repositories/idempotency.repository';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import {
  ReservationNotFoundError,
  ReservationStatusInvalidError,
  ReservationExpiredError,
} from '../errors';

export {
  ReservationNotFoundError,
  ReservationStatusInvalidError,
  ReservationExpiredError,
} from '../errors';

export class ConfirmReservationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly reservationId: string,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

export interface ConfirmReservationResult {
  reservationId: string;
  status: string;
  confirmedAt: string;
}

@Injectable()
export class ConfirmReservationUseCase {
  private readonly logger = new Logger(ConfirmReservationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: ReservationRepositoryPort,
    @Inject(POINTS_PORT)
    private readonly pointsPort: PointsPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(
    command: ConfirmReservationCommand,
  ): Promise<ConfirmReservationResult> {
    this.logger.debug(`Confirming reservation: ${command.reservationId}`);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.CONFIRM_RESERVATION,
        command.idempotencyKey,
      );

      if (existing) {
        this.logger.debug(`Idempotent request found: ${command.idempotencyKey}`);
        return existing.responseBody as ConfirmReservationResult;
      }
    }

    // 1. Fetch reservation
    const reservation = await this.reservationRepo.findById(
      command.tenantId,
      command.reservationId,
    );

    if (!reservation) {
      throw new ReservationNotFoundError(command.reservationId);
    }

    // 2. Validate status
    if (!reservation.isHold()) {
      throw new ReservationStatusInvalidError(reservation.status);
    }

    // 3. Check if expired
    if (reservation.hasExpired()) {
      throw new ReservationExpiredError();
    }

    // Execute within transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      // Lock reservation
      await this.reservationRepo.lockForUpdate(
        command.tenantId,
        command.reservationId,
        ctx,
      );

      // Re-fetch to ensure consistent state
      const lockedReservation = await this.reservationRepo.findById(
        command.tenantId,
        command.reservationId,
        ctx,
      );

      if (!lockedReservation || !lockedReservation.isHold()) {
        throw new ReservationStatusInvalidError(
          lockedReservation?.status ?? 'NOT_FOUND',
        );
      }

      if (lockedReservation.hasExpired()) {
        throw new ReservationExpiredError();
      }

      // 4. Commit points hold if exists
      if (lockedReservation.hasPointsHold()) {
        await this.pointsPort.commitHold({
          tenantId: command.tenantId,
          ownerType: 'USER',
          ownerId: lockedReservation.ownerId,
          referenceType: 'RESERVATION',
          referenceId: lockedReservation.id,
          reasonCode: 'RESERVATION_CONFIRMED',
          idempotencyKey: command.idempotencyKey
            ? `${command.idempotencyKey}:points-commit`
            : `res-${lockedReservation.id}:points-commit`,
        });
      }

      // 5. Confirm reservation
      lockedReservation.confirm();
      await this.reservationRepo.update(lockedReservation, ctx);

      // 6. Create outbox event
      const event = new ReservationConfirmedEvent(lockedReservation.id, {
        reservationId: lockedReservation.id,
        tenantId: command.tenantId,
        confirmedAt: lockedReservation.confirmedAt!.toISOString(),
        pointsHoldId: lockedReservation.pointsHoldId,
      });

      await this.outboxRepo.enqueue(
        {
          tenantId: command.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
        },
        ctx,
      );

      // 7. Save idempotency record
      const response: ConfirmReservationResult = {
        reservationId: lockedReservation.id,
        status: lockedReservation.status,
        confirmedAt: lockedReservation.confirmedAt!.toISOString(),
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.CONFIRM_RESERVATION,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Reservation confirmed: ${command.reservationId}`);
    return result;
  }

  private hashRequest(command: ConfirmReservationCommand): string {
    const payload = JSON.stringify({
      reservationId: command.reservationId,
    });
    return Buffer.from(payload).toString('base64');
  }
}
