import { PolicyScope } from '../value-objects';

export interface DomainEvent {
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

// Event Created
export class EventCreatedEvent implements DomainEvent {
  readonly eventType = 'EventCreated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    name: string;
    status: string;
    visibility: string;
    reservationMode: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Updated
export class EventUpdatedEvent implements DomainEvent {
  readonly eventType = 'EventUpdated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    changes: Record<string, unknown>;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Published
export class EventPublishedEvent implements DomainEvent {
  readonly eventType = 'EventPublished';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { eventId: string; tenantId: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Activated
export class EventActivatedEvent implements DomainEvent {
  readonly eventType = 'EventActivated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { eventId: string; tenantId: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Closed
export class EventClosedEvent implements DomainEvent {
  readonly eventType = 'EventClosed';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { eventId: string; tenantId: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Canceled
export class EventCanceledEvent implements DomainEvent {
  readonly eventType = 'EventCanceled';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { eventId: string; tenantId: string; reason?: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Phase Added
export class EventPhaseAddedEvent implements DomainEvent {
  readonly eventType = 'EventPhaseAdded';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    phaseId: string;
    phaseName: string;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Table Added
export class EventTableAddedEvent implements DomainEvent {
  readonly eventType = 'EventTableAdded';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    tableId: string;
    tableName: string;
    capacity: number;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Seat Added
export class EventSeatAddedEvent implements DomainEvent {
  readonly eventType = 'EventSeatAdded';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    tableId: string;
    seatId: string;
    seatNumber: number;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Policy Bound
export class EventPolicyBoundEvent implements DomainEvent {
  readonly eventType = 'EventPolicyBound';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    tenantId: string;
    policyCode: string;
    scope: PolicyScope;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Event Policy Unbound
export class EventPolicyUnboundEvent implements DomainEvent {
  readonly eventType = 'EventPolicyUnbound';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { eventId: string; tenantId: string; policyCode: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}
