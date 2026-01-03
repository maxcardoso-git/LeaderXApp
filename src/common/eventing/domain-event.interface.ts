/**
 * Base interface for domain events
 */
export interface DomainEvent {
  /** Unique event type identifier (e.g., "approval.decided") */
  readonly eventType: string;

  /** Aggregate type this event belongs to (e.g., "Approval") */
  readonly aggregateType: string;

  /** Aggregate ID */
  readonly aggregateId: string;

  /** When the event occurred */
  readonly occurredAt: Date;

  /** Correlation ID for tracing */
  readonly correlationId?: string;

  /** Convert event to a payload for storage/publishing */
  toPayload(): Record<string, unknown>;
}

/**
 * Interface for event handlers
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  /** Event type this handler processes */
  readonly eventType: string;

  /** Handle the event */
  handle(event: T): Promise<void>;
}

/**
 * Token for injecting event handlers
 */
export const EVENT_HANDLERS = 'EVENT_HANDLERS';
