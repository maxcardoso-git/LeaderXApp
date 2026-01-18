// Enums
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum RoleEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

export enum ScopeType {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
  EVENT = 'EVENT',
  COMMUNITY = 'COMMUNITY',
  TABLE = 'TABLE',
  NETWORK_NODE = 'NETWORK_NODE',
  RESOURCE = 'RESOURCE',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum AccessDecision {
  PERMIT = 'PERMIT',
  DENY = 'DENY',
}

// Value Objects
export * from './effective-access';
export * from './access-context';
export * from './transaction-context';
