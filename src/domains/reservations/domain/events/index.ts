export interface DomainEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Reservation Created Event
 */
export class ReservationCreatedEvent implements DomainEvent {
  readonly eventType = 'ReservationCreated';
  readonly aggregateType = 'RESERVATION';
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      reservationId: string;
      tenantId: string;
      eventId: string;
      resourceId: string;
      resourceType: string;
      ownerId: string;
      ownerType: string;
      status: string;
      expiresAt: string;
      pointsHoldId: string | null;
    },
  ) {
    this.occurredAt = new Date();
  }
}

/**
 * Reservation Confirmed Event
 */
export class ReservationConfirmedEvent implements DomainEvent {
  readonly eventType = 'ReservationConfirmed';
  readonly aggregateType = 'RESERVATION';
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      reservationId: string;
      tenantId: string;
      confirmedAt: string;
      pointsHoldId: string | null;
    },
  ) {
    this.occurredAt = new Date();
  }
}

/**
 * Reservation Released Event
 */
export class ReservationReleasedEvent implements DomainEvent {
  readonly eventType = 'ReservationReleased';
  readonly aggregateType = 'RESERVATION';
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      reservationId: string;
      tenantId: string;
      releasedAt: string;
      reason: string;
      pointsHoldId: string | null;
    },
  ) {
    this.occurredAt = new Date();
  }
}

/**
 * Reservation Expired Event
 */
export class ReservationExpiredEvent implements DomainEvent {
  readonly eventType = 'ReservationExpired';
  readonly aggregateType = 'RESERVATION';
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      reservationId: string;
      tenantId: string;
      expiredAt: string;
      pointsHoldId: string | null;
    },
  ) {
    this.occurredAt = new Date();
  }
}
