// ============================================
// RESERVATION DOMAIN ERRORS
// ============================================

// Policy errors
export class PolicyNotFoundError extends Error {
  readonly code = 'POLICY_NOT_FOUND';
  constructor(policyId: string) {
    super(`Policy not found: ${policyId}`);
  }
}

export class PolicyInactiveError extends Error {
  readonly code = 'POLICY_INACTIVE';
  constructor() {
    super('Policy is not active');
  }
}

export class OutsideReservationWindowError extends Error {
  readonly code = 'OUTSIDE_RESERVATION_WINDOW';
  constructor(message: string) {
    super(message);
  }
}

// Resource errors
export class ResourceNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  constructor(resourceId: string) {
    super(`Resource not found: ${resourceId}`);
  }
}

// Capacity errors
export class InsufficientCapacityError extends Error {
  readonly code = 'INSUFFICIENT_CAPACITY';
  constructor(message: string) {
    super(message);
  }
}

export class MaxPerUserExceededError extends Error {
  readonly code = 'MAX_PER_USER_EXCEEDED';
  constructor(message: string) {
    super(message);
  }
}

// Reservation errors
export class ReservationNotFoundError extends Error {
  readonly code = 'RESERVATION_NOT_FOUND';
  constructor(reservationId: string) {
    super(`Reservation not found: ${reservationId}`);
  }
}

export class ReservationStatusInvalidError extends Error {
  readonly code = 'RESERVATION_STATUS_INVALID';
  constructor(status: string, expected: string = 'HOLD') {
    super(`Cannot perform action: status is ${status}, expected ${expected}`);
  }
}

export class ReservationExpiredError extends Error {
  readonly code = 'RESERVATION_EXPIRED';
  constructor() {
    super('Cannot confirm reservation: hold has expired');
  }
}
