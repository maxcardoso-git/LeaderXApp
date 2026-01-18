import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Reservation,
  ResourceType,
  ReservationOwnerType,
  RESERVATION_REPOSITORY,
  RESOURCE_REPOSITORY,
  POLICY_REPOSITORY,
  POINTS_PORT,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
  PolicyRepositoryPort,
  PointsPort,
  PolicyEvaluator,
  AvailabilityCalculator,
  ReservationCreatedEvent,
} from '../../domain';
import {
  IdempotencyRepository,
  IdempotencyScope,
} from '../../../points/outbound/repositories/idempotency.repository';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import {
  PolicyNotFoundError,
  PolicyInactiveError,
  OutsideReservationWindowError,
  ResourceNotFoundError,
  InsufficientCapacityError,
  MaxPerUserExceededError,
} from '../errors';

export {
  PolicyNotFoundError,
  PolicyInactiveError,
  OutsideReservationWindowError,
  ResourceNotFoundError,
  InsufficientCapacityError,
  MaxPerUserExceededError,
} from '../errors';

export class CreateReservationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly eventId: string,
    public readonly resourceId: string,
    public readonly resourceType: ResourceType,
    public readonly ownerId: string,
    public readonly ownerType: ReservationOwnerType,
    public readonly policyId: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

export interface CreateReservationResult {
  reservationId: string;
  status: string;
  expiresAt: string;
  pointsHoldId: string | null;
}

@Injectable()
export class CreateReservationUseCase {
  private readonly logger = new Logger(CreateReservationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: ReservationRepositoryPort,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: ResourceRepositoryPort,
    @Inject(POLICY_REPOSITORY)
    private readonly policyRepo: PolicyRepositoryPort,
    @Inject(POINTS_PORT)
    private readonly pointsPort: PointsPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: CreateReservationCommand): Promise<CreateReservationResult> {
    this.logger.debug(
      `Creating reservation for ${command.ownerType}:${command.ownerId} on resource ${command.resourceId}`,
    );

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.CREATE_RESERVATION,
        command.idempotencyKey,
      );

      if (existing) {
        this.logger.debug(`Idempotent request found: ${command.idempotencyKey}`);
        return existing.responseBody as CreateReservationResult;
      }
    }

    // 1. Fetch and validate policy
    const policy = await this.policyRepo.findById(
      command.tenantId,
      command.policyId,
    );

    if (!policy) {
      throw new PolicyNotFoundError(command.policyId);
    }

    // Validate policy is active
    const policyActiveResult = PolicyEvaluator.validatePolicyActive(policy);
    if (!policyActiveResult.valid) {
      throw new PolicyInactiveError();
    }

    // Validate reservation window
    const windowResult = PolicyEvaluator.validateWindow(policy);
    if (!windowResult.valid) {
      throw new OutsideReservationWindowError(windowResult.error!);
    }

    // 2. Fetch and validate resource
    const resource = await this.resourceRepo.findById(
      command.tenantId,
      command.resourceId,
    );

    if (!resource) {
      throw new ResourceNotFoundError(command.resourceId);
    }

    if (!resource.isActive) {
      throw new ResourceNotFoundError(command.resourceId);
    }

    if (resource.eventId !== command.eventId) {
      throw new ResourceNotFoundError(command.resourceId);
    }

    if (resource.resourceType !== command.resourceType) {
      throw new ResourceNotFoundError(command.resourceId);
    }

    // 3. Validate maxPerUser
    const userReservationsCount = await this.reservationRepo.countActiveByOwner(
      command.tenantId,
      command.eventId,
      command.ownerId,
      command.resourceType,
    );

    const maxUserResult = PolicyEvaluator.validateMaxPerUser(
      policy,
      userReservationsCount,
    );
    if (!maxUserResult.valid) {
      throw new MaxPerUserExceededError(maxUserResult.error!);
    }

    // Generate reservation ID before transaction
    const reservationId = uuidv4();
    const expiresAt = policy.calculateExpiresAt();

    // Execute within transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      // 4. Lock resource and check capacity
      await this.resourceRepo.lockForUpdate(
        command.tenantId,
        command.resourceId,
        ctx,
      );

      const activeCount = await this.reservationRepo.countActiveByResource(
        command.tenantId,
        command.resourceId,
        ctx,
      );

      const capacityResult = AvailabilityCalculator.validateCapacity(
        resource,
        activeCount,
      );
      if (!capacityResult.valid) {
        throw new InsufficientCapacityError(capacityResult.error!);
      }

      // 5. Hold points if required
      let pointsHoldId: string | null = null;

      if (policy.requiresPoints()) {
        const pointsResult = await this.pointsPort.holdPoints({
          tenantId: command.tenantId,
          ownerType: this.mapOwnerTypeToPoints(command.ownerType),
          ownerId: command.ownerId,
          amount: policy.costInPoints.amount,
          reasonCode: 'RESERVATION_HOLD',
          referenceType: 'RESERVATION',
          referenceId: reservationId,
          idempotencyKey: command.idempotencyKey
            ? `${command.idempotencyKey}:points-hold`
            : `res-${reservationId}:points-hold`,
        });
        pointsHoldId = pointsResult.holdId;
      }

      // 6. Create reservation
      const reservation = Reservation.create(reservationId, {
        tenantId: command.tenantId,
        eventId: command.eventId,
        resourceId: command.resourceId,
        resourceType: command.resourceType,
        policyId: command.policyId,
        ownerId: command.ownerId,
        ownerType: command.ownerType,
        expiresAt,
        pointsHoldId: pointsHoldId ?? undefined,
        metadata: command.metadata,
      });

      await this.reservationRepo.create(reservation, ctx);

      // 7. Create outbox event
      const event = new ReservationCreatedEvent(reservationId, {
        reservationId,
        tenantId: command.tenantId,
        eventId: command.eventId,
        resourceId: command.resourceId,
        resourceType: command.resourceType,
        ownerId: command.ownerId,
        ownerType: command.ownerType,
        status: reservation.status,
        expiresAt: expiresAt.toISOString(),
        pointsHoldId,
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

      // 8. Save idempotency record
      const response: CreateReservationResult = {
        reservationId,
        status: reservation.status,
        expiresAt: expiresAt.toISOString(),
        pointsHoldId,
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.CREATE_RESERVATION,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Reservation created: ${reservationId}`);
    return result;
  }

  private mapOwnerTypeToPoints(ownerType: ReservationOwnerType): string {
    // Map reservation owner types to points owner types
    return 'USER'; // For now, all reservation owners are treated as USER in points
  }

  private hashRequest(command: CreateReservationCommand): string {
    const payload = JSON.stringify({
      eventId: command.eventId,
      resourceId: command.resourceId,
      resourceType: command.resourceType,
      ownerId: command.ownerId,
      ownerType: command.ownerType,
      policyId: command.policyId,
    });
    return Buffer.from(payload).toString('base64');
  }
}
