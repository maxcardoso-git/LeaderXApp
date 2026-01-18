import { Inject, Injectable } from '@nestjs/common';
import { GovernancePolicyAggregate } from '../aggregates';
import {
  GovernanceDecision,
  PolicyEvaluationContext,
  GovernanceEvaluationResult,
} from '../value-objects';
import {
  GovernancePolicyRepositoryPort,
  GOVERNANCE_POLICY_REPOSITORY,
  GovernanceAuditLogRepositoryPort,
  GOVERNANCE_AUDIT_LOG_REPOSITORY,
} from '../ports';
import { GovernanceAuditLog } from '../entities';

export interface EnforcementResult {
  finalDecision: GovernanceDecision;
  evaluations: GovernanceEvaluationResult[];
  denyReasons: string[];
}

@Injectable()
export class PolicyEnforcerService {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
    @Inject(GOVERNANCE_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: GovernanceAuditLogRepositoryPort,
  ) {}

  /**
   * Evaluate all applicable policies for a given context.
   * Uses DENY-override precedence: if any policy denies, the final decision is DENY.
   */
  async evaluate(context: PolicyEvaluationContext): Promise<EnforcementResult> {
    // Get all active policies (global and tenant-specific)
    const policies = await this.policyRepository.findAllActive(context.tenantId);

    const evaluations: GovernanceEvaluationResult[] = [];
    const denyReasons: string[] = [];

    for (const policy of policies) {
      const result = policy.evaluate(context);
      evaluations.push(result);

      // Create audit log
      const auditLog = GovernanceAuditLog.create({
        tenantId: context.tenantId,
        policyCode: policy.code,
        policyId: policy.id,
        decision: result.decision,
        context,
        reason: result.reason,
        evaluatedAt: result.evaluatedAt,
      });

      await this.auditLogRepository.create(auditLog);

      if (result.decision === GovernanceDecision.DENY) {
        denyReasons.push(result.reason ?? `Denied by policy: ${policy.code}`);
      }
    }

    // DENY always overrides ALLOW
    const finalDecision = denyReasons.length > 0
      ? GovernanceDecision.DENY
      : GovernanceDecision.ALLOW;

    return {
      finalDecision,
      evaluations,
      denyReasons,
    };
  }

  /**
   * Evaluate a specific policy by code.
   */
  async evaluatePolicy(
    policyCode: string,
    context: PolicyEvaluationContext,
  ): Promise<GovernanceEvaluationResult> {
    const policy = await this.policyRepository.findActiveByCode(policyCode);

    if (!policy) {
      const result: GovernanceEvaluationResult = {
        decision: GovernanceDecision.DENY,
        policyCode,
        reason: `Policy not found or not active: ${policyCode}`,
        evaluatedAt: new Date(),
      };

      // Create audit log for missing policy
      const auditLog = GovernanceAuditLog.create({
        tenantId: context.tenantId,
        policyCode,
        decision: GovernanceDecision.DENY,
        context,
        reason: result.reason,
      });

      await this.auditLogRepository.create(auditLog);

      return result;
    }

    const result = policy.evaluate(context);

    // Create audit log
    const auditLog = GovernanceAuditLog.create({
      tenantId: context.tenantId,
      policyCode: policy.code,
      policyId: policy.id,
      decision: result.decision,
      context,
      reason: result.reason,
      evaluatedAt: result.evaluatedAt,
    });

    await this.auditLogRepository.create(auditLog);

    return result;
  }

  /**
   * Check if an action is allowed for a given context.
   * This is a convenience method that returns a boolean.
   */
  async isAllowed(context: PolicyEvaluationContext): Promise<boolean> {
    const result = await this.evaluate(context);
    return result.finalDecision === GovernanceDecision.ALLOW;
  }

  /**
   * Assert that an action is allowed, throwing an error if denied.
   */
  async assertAllowed(context: PolicyEvaluationContext): Promise<void> {
    const result = await this.evaluate(context);

    if (result.finalDecision === GovernanceDecision.DENY) {
      throw new Error(
        `Access denied: ${result.denyReasons.join('; ')}`,
      );
    }
  }
}
