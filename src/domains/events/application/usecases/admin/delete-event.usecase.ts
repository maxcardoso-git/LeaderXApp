import { Inject, Injectable } from '@nestjs/common';
import { EventRepositoryPort, EVENT_REPOSITORY } from '../../../domain/ports';
import { EventNotFoundError } from '../../errors';

export class EventHasReservationsError extends Error {
  constructor(eventId: string) {
    super(`Cannot delete event ${eventId}: it has existing reservations`);
    this.name = 'EventHasReservationsError';
  }
}

export class CannotDeleteActiveEventError extends Error {
  constructor(eventId: string, status: string) {
    super(`Cannot delete event ${eventId}: event is ${status}`);
    this.name = 'CannotDeleteActiveEventError';
  }
}

export interface DeleteEventInput {
  tenantId: string;
  eventId: string;
  actorId?: string;
}

@Injectable()
export class DeleteEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(input: DeleteEventInput): Promise<void> {
    // Find the event
    const event = await this.eventRepository.findById(input.tenantId, input.eventId);
    if (!event) {
      throw new EventNotFoundError(input.eventId);
    }

    // Only allow deletion of DRAFT or CANCELED events
    if (event.status !== 'DRAFT' && event.status !== 'CANCELED') {
      throw new CannotDeleteActiveEventError(input.eventId, event.status);
    }

    // Check for existing reservations
    const hasReservations = await this.eventRepository.hasReservations(
      input.tenantId,
      input.eventId,
    );
    if (hasReservations) {
      throw new EventHasReservationsError(input.eventId);
    }

    // Delete the event and all related data
    await this.eventRepository.delete(input.tenantId, input.eventId);
  }
}
