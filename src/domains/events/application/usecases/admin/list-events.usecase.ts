import { Inject, Injectable } from '@nestjs/common';
import { EventAggregate } from '../../../domain/aggregates';
import {
  EventRepositoryPort,
  EVENT_REPOSITORY,
  PaginationOptions,
  PaginatedResult,
  FindEventsFilter,
} from '../../../domain/ports';
import { EventStatus, EventVisibility } from '../../../domain/value-objects';

export interface ListEventsInput {
  tenantId: string;
  status?: EventStatus;
  visibility?: EventVisibility;
  search?: string;
  startsAfter?: Date;
  startsBefore?: Date;
  pagination: PaginationOptions;
}

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(input: ListEventsInput): Promise<PaginatedResult<EventAggregate>> {
    const filter: FindEventsFilter = {
      tenantId: input.tenantId,
      status: input.status,
      visibility: input.visibility,
      search: input.search,
      startsAfter: input.startsAfter,
      startsBefore: input.startsBefore,
    };

    return this.eventRepository.list(filter, input.pagination);
  }
}
