import { EventAggregate } from '../aggregates';
import { EventStatus, EventVisibility } from '../value-objects';
import { PaginationOptions, PaginatedResult, TransactionContext } from './common';

export interface FindEventsFilter {
  tenantId: string;
  status?: EventStatus;
  visibility?: EventVisibility;
  startsAfter?: Date;
  startsBefore?: Date;
  search?: string;
}

export interface EventRepositoryPort {
  findById(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<EventAggregate | null>;

  findByIdWithRelations(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<EventAggregate | null>;

  list(
    filter: FindEventsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<EventAggregate>>;

  listPublic(
    tenantId: string,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<EventAggregate>>;

  create(event: EventAggregate, ctx?: TransactionContext): Promise<void>;

  update(event: EventAggregate, ctx?: TransactionContext): Promise<void>;

  saveWithRelations(
    event: EventAggregate,
    ctx?: TransactionContext,
  ): Promise<void>;

  delete(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<void>;

  hasReservations(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<boolean>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
