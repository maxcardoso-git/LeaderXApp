import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RESERVATION_REPOSITORY,
  ReservationRepositoryPort,
  Reservation,
  ReservationStatus,
} from '../../domain';

export class ListReservationsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly eventId?: string,
    public readonly ownerId?: string,
    public readonly status?: ReservationStatus,
    public readonly page: number = 0,
    public readonly size: number = 25,
  ) {}
}

export interface ReservationListItem {
  id: string;
  eventId: string;
  resourceId: string;
  resourceType: string;
  ownerId: string;
  ownerType: string;
  status: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface PagedReservationsResponse {
  meta: {
    page: number;
    size: number;
    total: number;
  };
  items: ReservationListItem[];
}

@Injectable()
export class ListReservationsUseCase {
  private readonly logger = new Logger(ListReservationsUseCase.name);

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: ReservationRepositoryPort,
  ) {}

  async execute(query: ListReservationsQuery): Promise<PagedReservationsResponse> {
    this.logger.debug(
      `Listing reservations for tenant ${query.tenantId}, event ${query.eventId ?? 'any'}`,
    );

    const result = await this.reservationRepo.list(
      {
        tenantId: query.tenantId,
        eventId: query.eventId,
        ownerId: query.ownerId,
        status: query.status,
      },
      {
        page: query.page,
        size: query.size,
      },
    );

    return {
      meta: {
        page: result.page,
        size: result.size,
        total: result.total,
      },
      items: result.items.map((r) => this.toListItem(r)),
    };
  }

  private toListItem(reservation: Reservation): ReservationListItem {
    return {
      id: reservation.id,
      eventId: reservation.eventId,
      resourceId: reservation.resourceId,
      resourceType: reservation.resourceType,
      ownerId: reservation.ownerId,
      ownerType: reservation.ownerType,
      status: reservation.status,
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
    };
  }
}
