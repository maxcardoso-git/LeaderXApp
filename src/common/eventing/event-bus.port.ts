import { DomainEvent, EventHandler } from './domain-event.interface';

/**
 * Abstract port for event bus implementations
 */
export abstract class EventBusPort {
  /**
   * Publish an event to all registered handlers
   * Implementations should use Promise.allSettled to not block on handler failures
   */
  abstract publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events
   */
  abstract publishAll(events: DomainEvent[]): Promise<PromiseSettledResult<void>[]>;

  /**
   * Register an event handler
   */
  abstract registerHandler(handler: EventHandler): void;

  /**
   * Unregister an event handler
   */
  abstract unregisterHandler(handler: EventHandler): void;
}
