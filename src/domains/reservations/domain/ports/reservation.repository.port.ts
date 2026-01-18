import { Reservation } from '../aggregates';
import {
  ResourceType,
  ReservationStatus,
  TransactionContext,
} from '../value-objects';

export interface FindReservationFilter {
  tenantId: string;
  eventId?: string;
  resourceId?: string;
  ownerId?: string;
  status?: ReservationStatus | ReservationStatus[];
}

export interface ListReservationsFilter {
  tenantId: string;
  eventId?: string;
  resourceId?: string;
  ownerId?: string;
  status?: ReservationStatus;
}

export interface PaginationOptions {
  page: number;
  size: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface ReservationRepositoryPort {
  /**
   * Find reservation by ID
   */
  findById(
    tenantId: string,
    reservationId: string,
    ctx?: TransactionContext,
  ): Promise<Reservation | null>;

  /**
   * Find reservations by filter
   */
  findByFilter(
    filter: FindReservationFilter,
    ctx?: TransactionContext,
  ): Promise<Reservation[]>;

  /**
   * Count active reservations for a resource
   */
  countActiveByResource(
    tenantId: string,
    resourceId: string,
    ctx?: TransactionContext,
  ): Promise<number>;

  /**
   * Count active reservations for a user within an event/policy
   */
  countActiveByOwner(
    tenantId: string,
    eventId: string,
    ownerId: string,
    resourceType: ResourceType,
    ctx?: TransactionContext,
  ): Promise<number>;

  /**
   * Find expired holds (status=HOLD and expiresAt <= now)
   */
  findExpiredHolds(
    batchSize: number,
    ctx?: TransactionContext,
  ): Promise<Reservation[]>;

  /**
   * List reservations with pagination
   */
  list(
    filter: ListReservationsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Reservation>>;

  /**
   * Create a new reservation
   */
  create(reservation: Reservation, ctx?: TransactionContext): Promise<void>;

  /**
   * Update an existing reservation
   */
  update(reservation: Reservation, ctx?: TransactionContext): Promise<void>;

  /**
   * Lock reservation for update (SELECT FOR UPDATE)
   */
  lockForUpdate(
    tenantId: string,
    reservationId: string,
    ctx: TransactionContext,
  ): Promise<void>;
}
