import { randomUUID } from 'crypto';
import {
  PolicyStatus,
  PolicyScope,
  PolicyRules,
  PolicyEvaluationContext,
  GovernanceDecision,
  GovernanceEvaluationResult,
  ConditionOperator,
} from '../value-objects';
import {
  GovernancePolicyCreatedEvent,
  GovernancePolicyUpdatedEvent,
  GovernancePolicyDeprecatedEvent,
  GovernanceEvaluatedEvent,
  DomainEvent,
} from '../events';

export interface GovernancePolicyProps {
  id?: string;
  tenantId?: string;
  code: string;
  name: string;
  description?: string;
  status?: PolicyStatus;
  scope?: PolicyScope;
  rules: PolicyRules;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GovernancePolicyAggregate {
  private _id: string;
  private _tenantId?: string;
  private _code: string;
  private _name: string;
  private _description?: string;
  private _status: PolicyStatus;
  private _scope: PolicyScope;
  private _rules: PolicyRules;
  private _version: number;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  private constructor(props: GovernancePolicyProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._status = props.status ?? PolicyStatus.ACTIVE;
    this._scope = props.scope ?? PolicyScope.GLOBAL;
    this._rules = props.rules;
    this._version = props.version ?? 1;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: Omit<GovernancePolicyProps, 'id' | 'status' | 'version' | 'createdAt' | 'updatedAt'>): GovernancePolicyAggregate {
    if (!props.code?.trim()) {
      throw new Error('Policy code is required');
    }
    if (!props.name?.trim()) {
      throw new Error('Policy name is required');
    }
    if (!props.rules) {
      throw new Error('Policy rules are required');
    }

    const policy = new GovernancePolicyAggregate({
      ...props,
      status: PolicyStatus.ACTIVE,
      version: 1,
    });

    policy.addDomainEvent(
      new GovernancePolicyCreatedEvent({
        policyId: policy._id,
        code: policy._code,
        name: policy._name,
        scope: policy._scope,
        tenantId: policy._tenantId,
      }),
    );

    return policy;
  }

  static reconstitute(props: GovernancePolicyProps): GovernancePolicyAggregate {
    return new GovernancePolicyAggregate(props);
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string | undefined { return this._tenantId; }
  get code(): string { return this._code; }
  get name(): string { return this._name; }
  get description(): string | undefined { return this._description; }
  get status(): PolicyStatus { return this._status; }
  get scope(): PolicyScope { return this._scope; }
  get rules(): PolicyRules { return this._rules; }
  get version(): number { return this._version; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): DomainEvent[] { return [...this._domainEvents]; }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // Update policy
  update(props: { name?: string; description?: string; rules?: PolicyRules }): void {
    if (this._status === PolicyStatus.DEPRECATED) {
      throw new Error('Cannot update a deprecated policy');
    }

    const changes: Record<string, unknown> = {};

    if (props.name !== undefined) {
      if (!props.name.trim()) {
        throw new Error('Policy name cannot be empty');
      }
      changes.name = { from: this._name, to: props.name };
      this._name = props.name;
    }

    if (props.description !== undefined) {
      changes.description = { from: this._description, to: props.description };
      this._description = props.description;
    }

    if (props.rules !== undefined) {
      changes.rules = { from: this._rules, to: props.rules };
      this._rules = props.rules;
    }

    if (Object.keys(changes).length > 0) {
      this._version += 1;
      this._updatedAt = new Date();

      this.addDomainEvent(
        new GovernancePolicyUpdatedEvent({
          policyId: this._id,
          code: this._code,
          version: this._version,
          changes,
        }),
      );
    }
  }

  // Deprecate policy
  deprecate(): void {
    if (this._status === PolicyStatus.DEPRECATED) {
      throw new Error('Policy is already deprecated');
    }

    this._status = PolicyStatus.DEPRECATED;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new GovernancePolicyDeprecatedEvent({
        policyId: this._id,
        code: this._code,
      }),
    );
  }

  // Evaluate policy against context
  evaluate(context: PolicyEvaluationContext): GovernanceEvaluationResult {
    if (this._status !== PolicyStatus.ACTIVE) {
      return {
        decision: GovernanceDecision.DENY,
        policyCode: this._code,
        policyId: this._id,
        reason: 'Policy is not active',
        evaluatedAt: new Date(),
      };
    }

    // Check if policy applies to this tenant
    if (this._scope === PolicyScope.TENANT && this._tenantId !== context.tenantId) {
      return {
        decision: GovernanceDecision.ALLOW,
        policyCode: this._code,
        policyId: this._id,
        reason: 'Policy does not apply to this tenant',
        evaluatedAt: new Date(),
      };
    }

    // Evaluate all conditions
    const conditionsMet = this.evaluateConditions(context);

    const decision = conditionsMet
      ? (this._rules.effect === 'ALLOW' ? GovernanceDecision.ALLOW : GovernanceDecision.DENY)
      : (this._rules.effect === 'ALLOW' ? GovernanceDecision.DENY : GovernanceDecision.ALLOW);

    const result: GovernanceEvaluationResult = {
      decision,
      policyCode: this._code,
      policyId: this._id,
      reason: conditionsMet
        ? `All conditions met, effect: ${this._rules.effect}`
        : `Conditions not met, inverted effect: ${decision}`,
      evaluatedAt: new Date(),
    };

    this.addDomainEvent(
      new GovernanceEvaluatedEvent({
        policyId: this._id,
        policyCode: this._code,
        decision: result.decision,
        context,
        reason: result.reason,
      }),
    );

    return result;
  }

  private evaluateConditions(context: PolicyEvaluationContext): boolean {
    if (!this._rules.conditions || this._rules.conditions.length === 0) {
      return true;
    }

    return this._rules.conditions.every((condition) => {
      const contextValue = this.getContextValue(context, condition.field);
      return this.evaluateCondition(contextValue, condition.operator, condition.value);
    });
  }

  private getContextValue(context: PolicyEvaluationContext, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  private evaluateCondition(contextValue: unknown, operator: ConditionOperator, ruleValue: unknown): boolean {
    switch (operator) {
      case ConditionOperator.EQUALS:
        return contextValue === ruleValue;

      case ConditionOperator.NOT_EQUALS:
        return contextValue !== ruleValue;

      case ConditionOperator.IN:
        return Array.isArray(ruleValue) && ruleValue.includes(contextValue);

      case ConditionOperator.NOT_IN:
        return Array.isArray(ruleValue) && !ruleValue.includes(contextValue);

      case ConditionOperator.CONTAINS:
        return typeof contextValue === 'string' && contextValue.includes(String(ruleValue));

      case ConditionOperator.STARTS_WITH:
        return typeof contextValue === 'string' && contextValue.startsWith(String(ruleValue));

      case ConditionOperator.EXISTS:
        return contextValue !== undefined && contextValue !== null;

      case ConditionOperator.GREATER_THAN:
        return typeof contextValue === 'number' && typeof ruleValue === 'number' && contextValue > ruleValue;

      case ConditionOperator.LESS_THAN:
        return typeof contextValue === 'number' && typeof ruleValue === 'number' && contextValue < ruleValue;

      default:
        return false;
    }
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      code: this._code,
      name: this._name,
      description: this._description,
      status: this._status,
      scope: this._scope,
      rules: this._rules,
      version: this._version,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
