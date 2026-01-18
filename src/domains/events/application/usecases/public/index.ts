import { Inject, Injectable } from '@nestjs/common';
import { EventAggregate } from '../../../domain/aggregates';
import { EventRepositoryPort, EVENT_REPOSITORY, PaginationOptions, PaginatedResult } from '../../../domain/ports';
import { EventAvailabilityService, TableAvailability, SeatAvailability } from '../../../domain/services';
import { EventAvailability } from '../../../domain/value-objects';
import { EventNotFoundError } from '../../errors';

// List Public Events
@Injectable()
export class ListPublicEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(input: { tenantId: string; pagination: PaginationOptions }): Promise<PaginatedResult<EventAggregate>> {
    return this.eventRepository.listPublic(input.tenantId, input.pagination);
  }
}

// Get Event Details
@Injectable()
export class GetEventDetailsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(input: { tenantId: string; eventId: string }): Promise<EventAggregate> {
    const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId);
    if (!event) throw new EventNotFoundError(input.eventId);
    return event;
  }
}

// Get Event Tables
@Injectable()
export class GetEventTablesUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly availabilityService: EventAvailabilityService,
  ) {}

  async execute(input: { tenantId: string; eventId: string }): Promise<TableAvailability[]> {
    const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId);
    if (!event) throw new EventNotFoundError(input.eventId);
    return this.availabilityService.getTablesAvailability(event);
  }
}

// Get Event Seats
@Injectable()
export class GetEventSeatsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly availabilityService: EventAvailabilityService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; tableId: string }): Promise<SeatAvailability[]> {
    const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId);
    if (!event) throw new EventNotFoundError(input.eventId);
    return this.availabilityService.getSeatsAvailability(event, input.tableId);
  }
}

// Check Event Availability
@Injectable()
export class CheckEventAvailabilityUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly availabilityService: EventAvailabilityService,
  ) {}

  async execute(input: { tenantId: string; eventId: string }): Promise<EventAvailability> {
    const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId);
    if (!event) throw new EventNotFoundError(input.eventId);
    return this.availabilityService.calculateEventAvailability(event);
  }
}
