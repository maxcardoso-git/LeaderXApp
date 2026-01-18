import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RESERVATION_REPOSITORY,
  ReservationRepositoryPort,
  Reservation,
} from '../../domain';
import { ReservationNotFoundError } from '../errors';

export class GetReservationQuery {
  constructor(
    public readonly tenantId: string,
    public readonly reservationId: string,
  ) {}
}

export interface ReservationResponse {
  id: string;
  eventId: string;
  resourceId: string;
  resourceType: string;
  policyId: string;
  ownerId: string;
  ownerType: string;
  status: string;
  pointsHoldId: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class GetReservationUseCase {
  private readonly logger = new Logger(GetReservationUseCase.name);

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: ReservationRepositoryPort,
  ) {}

  async execute(query: GetReservationQuery): Promise<ReservationResponse> {
    this.logger.debug(`Getting reservation: ${query.reservationId}`);

    const reservation = await this.reservationRepo.findById(
      query.tenantId,
      query.reservationId,
    );

    if (!reservation) {
      throw new ReservationNotFoundError(query.reservationId);
    }

    return this.toResponse(reservation);
  }

  private toResponse(reservation: Reservation): ReservationResponse {
    return {
      id: reservation.id,
      eventId: reservation.eventId,
      resourceId: reservation.resourceId,
      resourceType: reservation.resourceType,
      policyId: reservation.policyId,
      ownerId: reservation.ownerId,
      ownerType: reservation.ownerType,
      status: reservation.status,
      pointsHoldId: reservation.pointsHoldId,
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
  }
}
