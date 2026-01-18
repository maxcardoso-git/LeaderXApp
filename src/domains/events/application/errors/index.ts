export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`);
    this.name = 'EventNotFoundError';
  }
}

export class EventPhaseNotFoundError extends Error {
  constructor(phaseId: string) {
    super(`Event phase not found: ${phaseId}`);
    this.name = 'EventPhaseNotFoundError';
  }
}

export class EventTableNotFoundError extends Error {
  constructor(tableId: string) {
    super(`Event table not found: ${tableId}`);
    this.name = 'EventTableNotFoundError';
  }
}

export class EventSeatNotFoundError extends Error {
  constructor(seatId: string) {
    super(`Event seat not found: ${seatId}`);
    this.name = 'EventSeatNotFoundError';
  }
}

export class InvalidEventStatusTransitionError extends Error {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid status transition from ${currentStatus} to ${targetStatus}`,
    );
    this.name = 'InvalidEventStatusTransitionError';
  }
}

export class EventCannotBeModifiedError extends Error {
  constructor(eventId: string, reason: string) {
    super(`Event ${eventId} cannot be modified: ${reason}`);
    this.name = 'EventCannotBeModifiedError';
  }
}

export class PolicyAlreadyBoundError extends Error {
  constructor(eventId: string, policyCode: string) {
    super(`Policy ${policyCode} is already bound to event ${eventId}`);
    this.name = 'PolicyAlreadyBoundError';
  }
}

export class PolicyNotBoundError extends Error {
  constructor(eventId: string, policyCode: string) {
    super(`Policy ${policyCode} is not bound to event ${eventId}`);
    this.name = 'PolicyNotBoundError';
  }
}
