import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  RESERVATION_REPOSITORY,
  POINTS_PORT,
  ReservationRepositoryPort,
  PointsPort,
  ReservationReleasedEvent,
} from '../../domain';
import {
  IdempotencyRepository,
  IdempotencyScope,
} from '../../../points/outbound/repositories/idempotency.repository';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import {
  ReservationNotFoundError,
  ReservationStatusInvalidError,
} from '../errors';

export class ReleaseReservationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly reservationId: string,
    public readonly reason: string,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

export interface ReleaseReservationResult {
  reservationId: string;
  status: string;
  releasedAt: string;
}

@Injectable()
export class ReleaseReservationUseCase {
  private readonly logger = new Logger(ReleaseReservationUseCase.name);

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
    command: ReleaseReservationCommand,
  ): Promise<ReleaseReservationResult> {
    this.logger.debug(`Releasing reservation: ${command.reservationId}`);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.RELEASE_RESERVATION,
        command.idempotencyKey,
      );

      if (existing) {
        this.logger.debug(`Idempotent request found: ${command.idempotencyKey}`);
        return existing.responseBody as ReleaseReservationResult;
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

      // 3. Release points hold if exists
      if (lockedReservation.hasPointsHold()) {
        await this.pointsPort.releaseHold({
          tenantId: command.tenantId,
          ownerType: 'USER',
          ownerId: lockedReservation.ownerId,
          referenceType: 'RESERVATION',
          referenceId: lockedReservation.id,
          reasonCode: command.reason,
          idempotencyKey: command.idempotencyKey
            ? `${command.idempotencyKey}:points-release`
            : `res-${lockedReservation.id}:points-release`,
        });
      }

      // 4. Release reservation
      lockedReservation.release();
      await this.reservationRepo.update(lockedReservation, ctx);

      // 5. Create outbox event
      const event = new ReservationReleasedEvent(lockedReservation.id, {
        reservationId: lockedReservation.id,
        tenantId: command.tenantId,
        releasedAt: lockedReservation.releasedAt!.toISOString(),
        reason: command.reason,
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

      // 6. Save idempotency record
      const response: ReleaseReservationResult = {
        reservationId: lockedReservation.id,
        status: lockedReservation.status,
        releasedAt: lockedReservation.releasedAt!.toISOString(),
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.RELEASE_RESERVATION,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Reservation released: ${command.reservationId}`);
    return result;
  }

  private hashRequest(command: ReleaseReservationCommand): string {
    const payload = JSON.stringify({
      reservationId: command.reservationId,
      reason: command.reason,
    });
    return Buffer.from(payload).toString('base64');
  }
}
