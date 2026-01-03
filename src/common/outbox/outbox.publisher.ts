import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { CreateOutboxEventDto } from './outbox.interface';
import { DomainEvent } from '../eventing/domain-event.interface';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(private readonly repository: OutboxRepository) {}

  /**
   * Enqueue a domain event for reliable delivery via outbox
   * This should be called in the same transaction as the business operation
   */
  async enqueue(event: DomainEvent): Promise<void> {
    const dto: CreateOutboxEventDto = {
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
      payload: event.toPayload(),
    };

    await this.repository.create(dto);

    this.logger.debug(
      `Enqueued outbox event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );
  }

  /**
   * Enqueue raw event data (for cases where you don't have a DomainEvent instance)
   */
  async enqueueRaw(dto: CreateOutboxEventDto): Promise<void> {
    await this.repository.create(dto);

    this.logger.debug(
      `Enqueued raw outbox event: ${dto.eventType} for ${dto.aggregateType}:${dto.aggregateId}`,
    );
  }

  /**
   * Enqueue multiple events
   */
  async enqueueAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.enqueue(event);
    }
  }
}
