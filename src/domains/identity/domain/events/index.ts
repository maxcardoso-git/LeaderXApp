export interface IdentityDomainEvent {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
}

// User Events
export class UserCreatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.UserCreated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      status: string;
      email?: string;
      fullName?: string;
    },
  ) {}
}

export class UserUpdatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.UserUpdated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      status: string;
      email?: string;
      fullName?: string;
      changes: string[];
    },
  ) {}
}

export class UserDeactivatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.UserDeactivated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      deactivatedAt: string;
    },
  ) {}
}

export class UserDeletedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.UserDeleted';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      email?: string;
      deletedAt: string;
    },
  ) {}
}

// Permission Events
export class PermissionCreatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.PermissionCreated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      permissionId: string;
      tenantId: string;
      code: string;
      name: string;
      category?: string;
    },
  ) {}
}

// Role Events
export class RoleCreatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.RoleCreated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      roleId: string;
      tenantId: string;
      code: string;
      name: string;
      effect: string;
    },
  ) {}
}

export class RolePermissionsUpsertedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.RolePermissionsUpserted';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      roleId: string;
      tenantId: string;
      permissions: Array<{ permissionId: string; effect: string }>;
    },
  ) {}
}

// Assignment Events
export class RoleAssignedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.RoleAssigned';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      assignmentId: string;
      tenantId: string;
      userId: string;
      roleId: string;
      scopeType: string;
      scopeId?: string;
      assignedBy?: string;
    },
  ) {}
}

export class RoleRevokedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.RoleRevoked';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      assignmentId: string;
      tenantId: string;
      userId: string;
      roleId: string;
      revokedAt: string;
    },
  ) {}
}

// Access Evaluation Events
export class AccessEvaluatedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.AccessEvaluated';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      permissionCode: string;
      decision: string;
      matchedRules: string[];
    },
  ) {}
}

export class AccessDeniedEvent implements IdentityDomainEvent {
  readonly aggregateType = 'IDENTITY';
  readonly eventType = 'Identity.AccessDenied';

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      userId: string;
      tenantId: string;
      permissionCode: string;
      reason: string;
      denyReasons: string[];
    },
  ) {}
}
