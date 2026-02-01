// Event Status - lifecycle states
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELED = 'CANCELED',
}

// Event Visibility
export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
}

// Reservation Mode
export enum ReservationMode {
  POINTS = 'POINTS',
  FREE = 'FREE',
  APPROVAL = 'APPROVAL',
}

// Policy Scope for bindings
export enum PolicyScope {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
  EVENT = 'EVENT',
}

// Event availability result
export interface EventAvailability {
  eventId: string;
  totalTables: number;
  availableTables: number;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
}

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELED],
  [EventStatus.PUBLISHED]: [EventStatus.ACTIVE, EventStatus.DRAFT, EventStatus.CANCELED],
  [EventStatus.ACTIVE]: [EventStatus.CLOSED, EventStatus.CANCELED],
  [EventStatus.CLOSED]: [EventStatus.DRAFT], // Allow reopen to DRAFT
  [EventStatus.CANCELED]: [],
};
