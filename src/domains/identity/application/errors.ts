// User Errors
export class UserNotFoundError extends Error {
  readonly code = 'USER_NOT_FOUND';

  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends Error {
  readonly code = 'USER_ALREADY_EXISTS';

  constructor(identifier: string) {
    super(`User already exists: ${identifier}`);
    this.name = 'UserAlreadyExistsError';
  }
}

// Permission Errors
export class PermissionNotFoundError extends Error {
  readonly code = 'PERMISSION_NOT_FOUND';

  constructor(identifier: string) {
    super(`Permission ${identifier} not found`);
    this.name = 'PermissionNotFoundError';
  }
}

export class PermissionCodeAlreadyExistsError extends Error {
  readonly code = 'PERMISSION_CODE_ALREADY_EXISTS';

  constructor(code: string) {
    super(`Permission code already exists: ${code}`);
    this.name = 'PermissionCodeAlreadyExistsError';
  }
}

// Role Errors
export class RoleNotFoundError extends Error {
  readonly code = 'ROLE_NOT_FOUND';

  constructor(identifier: string) {
    super(`Role ${identifier} not found`);
    this.name = 'RoleNotFoundError';
  }
}

export class RoleCodeAlreadyExistsError extends Error {
  readonly code = 'ROLE_CODE_ALREADY_EXISTS';

  constructor(code: string) {
    super(`Role code already exists: ${code}`);
    this.name = 'RoleCodeAlreadyExistsError';
  }
}

// Assignment Errors
export class AssignmentNotFoundError extends Error {
  readonly code = 'ASSIGNMENT_NOT_FOUND';

  constructor(assignmentId: string) {
    super(`Assignment ${assignmentId} not found`);
    this.name = 'AssignmentNotFoundError';
  }
}

export class DuplicateAssignmentError extends Error {
  readonly code = 'DUPLICATE_ASSIGNMENT';

  constructor() {
    super('An active assignment with the same user, role, and scope already exists');
    this.name = 'DuplicateAssignmentError';
  }
}

export class UserOrRoleNotFoundError extends Error {
  readonly code = 'USER_OR_ROLE_NOT_FOUND';

  constructor(detail: string) {
    super(`User or role not found: ${detail}`);
    this.name = 'UserOrRoleNotFoundError';
  }
}

// Scope Errors
export class InvalidScopeError extends Error {
  readonly code = 'INVALID_SCOPE';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidScopeError';
  }
}

// Access Errors
export class AccessDeniedError extends Error {
  readonly code = 'ACCESS_DENIED';

  constructor(reason: string) {
    super(`Access denied: ${reason}`);
    this.name = 'AccessDeniedError';
  }
}

// Idempotency Errors
export class IdempotencyMismatchError extends Error {
  readonly code = 'IDEMPOTENCY_MISMATCH';

  constructor() {
    super('Idempotency key was used with different request parameters');
    this.name = 'IdempotencyMismatchError';
  }
}
