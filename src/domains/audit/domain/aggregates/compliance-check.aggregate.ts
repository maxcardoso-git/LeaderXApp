import {
  ComplianceSeverity,
  ComplianceRules,
  ComplianceResultStatus,
  ComplianceRuleOperator,
  EvidenceItem,
} from '../value-objects';

export interface ComplianceCheckProps {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  description?: string;
  severity: ComplianceSeverity;
  rules: ComplianceRules;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceCheckEvaluationResult {
  checkId: string;
  checkCode: string;
  status: ComplianceResultStatus;
  evidence: EvidenceItem[];
  executedAt: Date;
}

export class ComplianceCheckAggregate {
  readonly id: string;
  readonly tenantId?: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly severity: ComplianceSeverity;
  readonly rules: ComplianceRules;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ComplianceCheckProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.severity = props.severity;
    this.rules = props.rules;
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Evaluates the compliance check against provided data.
   * Compliance checks are deterministic - same inputs produce same outputs.
   */
  evaluate(data: Record<string, unknown>): ComplianceCheckEvaluationResult {
    const evidence: EvidenceItem[] = [];
    let hasFailed = false;
    let hasWarning = false;

    for (const rule of this.rules.rules) {
      const fieldValue = this.getNestedValue(data, rule.field);
      const passed = this.evaluateRule(rule.operator, fieldValue, rule.value);

      evidence.push({
        source: 'compliance-evaluator',
        type: 'rule-evaluation',
        data: {
          field: rule.field,
          operator: rule.operator,
          expectedValue: rule.value,
          actualValue: fieldValue,
          passed,
          errorMessage: !passed ? rule.errorMessage : undefined,
        },
        collectedAt: new Date(),
      });

      if (!passed) {
        if (this.severity === ComplianceSeverity.LOW) {
          hasWarning = true;
        } else {
          hasFailed = true;
        }
      }
    }

    let status: ComplianceResultStatus;
    if (hasFailed) {
      status = ComplianceResultStatus.FAIL;
    } else if (hasWarning) {
      status = ComplianceResultStatus.WARNING;
    } else {
      status = ComplianceResultStatus.PASS;
    }

    return {
      checkId: this.id,
      checkCode: this.code,
      status,
      evidence,
      executedAt: new Date(),
    };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  private evaluateRule(
    operator: ComplianceRuleOperator,
    fieldValue: unknown,
    expectedValue: unknown,
  ): boolean {
    switch (operator) {
      case ComplianceRuleOperator.EQUALS:
        return fieldValue === expectedValue;

      case ComplianceRuleOperator.NOT_EQUALS:
        return fieldValue !== expectedValue;

      case ComplianceRuleOperator.GREATER_THAN:
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue > expectedValue
          : false;

      case ComplianceRuleOperator.LESS_THAN:
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue < expectedValue
          : false;

      case ComplianceRuleOperator.IN:
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);

      case ComplianceRuleOperator.NOT_IN:
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);

      case ComplianceRuleOperator.EXISTS:
        return fieldValue !== undefined && fieldValue !== null;

      case ComplianceRuleOperator.NOT_EXISTS:
        return fieldValue === undefined || fieldValue === null;

      case ComplianceRuleOperator.CONTAINS:
        if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
          return fieldValue.includes(expectedValue);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(expectedValue);
        }
        return false;

      default:
        return false;
    }
  }
}
