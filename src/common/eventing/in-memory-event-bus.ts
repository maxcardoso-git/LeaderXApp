import { Injectable, Logger } from '@nestjs/common';
import { EventBusPort } from './event-bus.port';
import { DomainEvent, EventHandler } from './domain-event.interface';
import { RetryService } from '../retry/retry.service';
import { RETRY_PRESETS } from '../retry/retry.config';

@Injectable()
export class InMemoryEventBus extends EventBusPort {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(private readonly retryService: RetryService) {
    super();
  }

  /**
   * Register an event handler
   */
  registerHandler(handler: EventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || new Set();
    handlers.add(handler);
    this.handlers.set(handler.eventType, handlers);

    this.logger.log(
      `Registered handler ${handler.constructor.name} for event: ${handler.eventType}`,
    );
  }

  /**
   * Unregister an event handler
   */
  unregisterHandler(handler: EventHandler): void {
    const handlers = this.handlers.get(handler.eventType);
    if (handlers) {
      handlers.delete(handler);
      this.logger.log(
        `Unregistered handler ${handler.constructor.name} for event: ${handler.eventType}`,
      );
    }
  }

  /**
   * Publish an event to all registered handlers
   * Uses Promise.allSettled to ensure all handlers are called even if some fail
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`No handlers registered for event: ${event.eventType}`);
      return;
    }

    this.logger.debug(
      `Publishing event ${event.eventType} to ${handlers.size} handler(s)`,
    );

    // Execute all handlers in parallel with retry
    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) =>
        this.executeHandlerWithRetry(handler, event),
      ),
    );

    // Log any failures (but don't throw - we use allSettled intentionally)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const handlerName = Array.from(handlers)[index]?.constructor.name;
        this.logger.error(
          `Handler ${handlerName} failed for event ${event.eventType}: ${result.reason}`,
        );
      }
    });
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: DomainEvent[]): Promise<PromiseSettledResult<void>[]> {
    return Promise.allSettled(events.map((event) => this.publish(event)));
  }

  /**
   * Execute a handler with retry logic
   */
  private async executeHandlerWithRetry(
    handler: EventHandler,
    event: DomainEvent,
  ): Promise<void> {
    const operationName = `${handler.constructor.name}:${event.eventType}`;

    return this.retryService.execute(
      () => handler.handle(event),
      RETRY_PRESETS.STANDARD,
      operationName,
    );
  }
}
