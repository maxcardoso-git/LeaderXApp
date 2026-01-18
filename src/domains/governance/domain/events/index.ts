import { GovernanceDecision, PolicyEvaluationContext, PolicyScope } from '../value-objects';

export interface DomainEvent {
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

// Policy Created
export class GovernancePolicyCreatedEvent implements DomainEvent {
  readonly eventType = 'GovernancePolicyCreated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    policyId: string;
    code: string;
    name: string;
    scope: PolicyScope;
    tenantId?: string;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Policy Updated
export class GovernancePolicyUpdatedEvent implements DomainEvent {
  readonly eventType = 'GovernancePolicyUpdated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    policyId: string;
    code: string;
    version: number;
    changes: Record<string, unknown>;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Policy Deprecated
export class GovernancePolicyDeprecatedEvent implements DomainEvent {
  readonly eventType = 'GovernancePolicyDeprecated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: { policyId: string; code: string }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Governance Evaluated
export class GovernanceEvaluatedEvent implements DomainEvent {
  readonly eventType = 'GovernanceEvaluated';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    policyId: string;
    policyCode: string;
    decision: GovernanceDecision;
    context: PolicyEvaluationContext;
    reason?: string;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Governance Denied
export class GovernanceDeniedEvent implements DomainEvent {
  readonly eventType = 'GovernanceDenied';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    policyCode: string;
    context: PolicyEvaluationContext;
    reason?: string;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}

// Governance Allowed
export class GovernanceAllowedEvent implements DomainEvent {
  readonly eventType = 'GovernanceAllowed';
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    policyCode: string;
    context: PolicyEvaluationContext;
  }) {
    this.occurredAt = new Date();
    this.payload = data;
  }
}
