// Policy Status
export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

// Policy Scope
export enum PolicyScope {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
}

// Governance Decision
export enum GovernanceDecision {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

// Rule Effect
export enum RuleEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

// Condition Operator
export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  EXISTS = 'EXISTS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
}

// Policy Condition
export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

// Policy Rules
export interface PolicyRules {
  conditions: PolicyCondition[];
  effect: RuleEffect;
}

// Policy Evaluation Context
export interface PolicyEvaluationContext {
  actorId: string;
  actorRoles?: string[];
  resourceType?: string;
  resourceId?: string;
  action: string;
  tenantId: string;
  networkNodeId?: string;
  metadata?: Record<string, unknown>;
}

// Governance Evaluation Result
export interface GovernanceEvaluationResult {
  decision: GovernanceDecision;
  policyCode: string;
  policyId?: string;
  reason?: string;
  evaluatedAt: Date;
}

