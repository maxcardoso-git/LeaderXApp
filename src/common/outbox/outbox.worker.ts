import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OutboxRepository } from './outbox.repository';
import { InMemoryEventBus } from '../eventing/in-memory-event-bus';
import { DomainEvent } from '../eventing/domain-event.interface';
import { OutboxEvent } from './outbox.interface';

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private isProcessing = false;
  private isShuttingDown = false;
  private isEnabled: boolean;
  private batchSize: number;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly eventBus: InMemoryEventBus,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('OUTBOX_WORKER_ENABLED', 'true') === 'true';
    this.batchSize = parseInt(
      this.configService.get<string>('OUTBOX_BATCH_SIZE', '10'),
      10,
    );
  }

  onModuleInit(): void {
    if (this.isEnabled) {
      this.logger.log('Outbox worker initialized and enabled');
    } else {
      this.logger.warn('Outbox worker is disabled');
    }
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    this.logger.log('Outbox worker shutting down');
  }

  /**
   * Process pending outbox events every 5 seconds
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox(): Promise<void> {
    if (!this.isEnabled || this.isProcessing || this.isShuttingDown) {
      return;
    }

    this.isProcessing = true;

    try {
      const events = await this.repository.fetchPendingWithLock(this.batchSize);

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} outbox events`);

      for (const event of events) {
        if (this.isShuttingDown) break;
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error('Error in outbox worker', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup old published events (daily at 3am)
   */
  @Cron('0 3 * * *')
  async cleanupPublishedEvents(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const deleted = await this.repository.deletePublished(14);
      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} old published outbox events`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up outbox events', error);
    }
  }

  /**
   * Process a single outbox event
   */
  private async processEvent(outboxEvent: OutboxEvent): Promise<void> {
    try {
      // Reconstruct domain event from outbox record
      const domainEvent = this.reconstructEvent(outboxEvent);

      // Publish to event bus
      await this.eventBus.publish(domainEvent);

      // Mark as published
      await this.repository.markPublished(outboxEvent.id);

      this.logger.debug(
        `Published outbox event: ${outboxEvent.eventType} (${outboxEvent.id})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to process outbox event ${outboxEvent.id}: ${errorMessage}`,
      );

      await this.repository.markForRetry(outboxEvent.id, errorMessage);
    }
  }

  /**
   * Reconstruct a DomainEvent from an OutboxEvent
   */
  private reconstructEvent(outbox: OutboxEvent): DomainEvent {
    return {
      eventType: outbox.eventType,
      aggregateType: outbox.aggregateType,
      aggregateId: outbox.aggregateId,
      occurredAt: outbox.createdAt,
      correlationId: outbox.correlationId,
      toPayload: () => outbox.payload,
    };
  }
}
