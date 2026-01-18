// ============================================
// AUDIT & COMPLIANCE DOMAIN - VALUE OBJECTS
// ============================================

export enum ComplianceSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ComplianceResultStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
}

export enum ComplianceRuleType {
  RULE_SET = 'RULE_SET',
}

export enum ComplianceRuleOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
  CONTAINS = 'CONTAINS',
}

export interface ComplianceRule {
  field: string;
  operator: ComplianceRuleOperator;
  value: unknown;
  errorMessage?: string;
}

export interface ComplianceRules {
  type: ComplianceRuleType;
  rules: ComplianceRule[];
}

export interface ComplianceSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface EvidenceItem {
  source: string;
  type: string;
  data: Record<string, unknown>;
  collectedAt: Date;
}

export interface ComplianceEvaluationContext {
  tenantId: string;
  actorId?: string;
  targetDomain?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
}
