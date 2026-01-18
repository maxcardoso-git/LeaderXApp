import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { GovernancePolicyAggregate } from '../../domain/aggregates';
import {
  GovernancePolicyRepositoryPort,
  GOVERNANCE_POLICY_REPOSITORY,
  GovernanceAuditLogRepositoryPort,
  GOVERNANCE_AUDIT_LOG_REPOSITORY,
  PaginationOptions,
  PaginatedResult,
  FindPoliciesFilter,
  FindAuditLogsFilter,
} from '../../domain/ports';
import { PolicyEnforcerService, EnforcementResult } from '../../domain/services';
import { GovernanceAuditLog } from '../../domain/entities';
import {
  PolicyScope,
  PolicyRules,
  PolicyEvaluationContext,
  GovernanceEvaluationResult,
  GovernanceDecision,
} from '../../domain/value-objects';
import { PolicyNotFoundError, PolicyCodeAlreadyExistsError } from '../errors';

// Create Policy
export interface CreatePolicyInput {
  tenantId?: string;
  code: string;
  name: string;
  description?: string;
  scope?: PolicyScope;
  rules: PolicyRules;
  actorId?: string;
}

@Injectable()
export class CreatePolicyUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreatePolicyInput): Promise<GovernancePolicyAggregate> {
    return this.prisma.$transaction(async (tx) => {
      // Check if code already exists
      const existing = await this.policyRepository.findByCode(input.code, { tx });
      if (existing) {
        throw new PolicyCodeAlreadyExistsError(input.code);
      }

      const policy = GovernancePolicyAggregate.create({
        tenantId: input.tenantId,
        code: input.code,
        name: input.name,
        description: input.description,
        scope: input.scope,
        rules: input.rules,
      });

      await this.policyRepository.create(policy, { tx });

      for (const de of policy.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'GOVERNANCE', aggregateId: policy.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      policy.clearDomainEvents();

      return policy;
    });
  }
}

// Update Policy
export interface UpdatePolicyInput {
  policyId: string;
  name?: string;
  description?: string;
  rules?: PolicyRules;
  actorId?: string;
}

@Injectable()
export class UpdatePolicyUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdatePolicyInput): Promise<GovernancePolicyAggregate> {
    return this.prisma.$transaction(async (tx) => {
      const policy = await this.policyRepository.findById(input.policyId, { tx });
      if (!policy) {
        throw new PolicyNotFoundError(input.policyId);
      }

      policy.update({
        name: input.name,
        description: input.description,
        rules: input.rules,
      });

      await this.policyRepository.update(policy, { tx });

      for (const de of policy.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: policy.tenantId, aggregateType: 'GOVERNANCE', aggregateId: policy.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      policy.clearDomainEvents();

      return policy;
    });
  }
}

// Deprecate Policy
@Injectable()
export class DeprecatePolicyUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { policyId: string; actorId?: string }): Promise<GovernancePolicyAggregate> {
    return this.prisma.$transaction(async (tx) => {
      const policy = await this.policyRepository.findById(input.policyId, { tx });
      if (!policy) {
        throw new PolicyNotFoundError(input.policyId);
      }

      policy.deprecate();
      await this.policyRepository.update(policy, { tx });

      for (const de of policy.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: policy.tenantId, aggregateType: 'GOVERNANCE', aggregateId: policy.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      policy.clearDomainEvents();

      return policy;
    });
  }
}

// Get Policy By ID
@Injectable()
export class GetPolicyByIdUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
  ) {}

  async execute(policyId: string): Promise<GovernancePolicyAggregate> {
    const policy = await this.policyRepository.findById(policyId);
    if (!policy) {
      throw new PolicyNotFoundError(policyId);
    }
    return policy;
  }
}

// Get Policy By Code
@Injectable()
export class GetPolicyByCodeUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
  ) {}

  async execute(code: string): Promise<GovernancePolicyAggregate> {
    const policy = await this.policyRepository.findByCode(code);
    if (!policy) {
      throw new PolicyNotFoundError(code);
    }
    return policy;
  }
}

// List Policies
@Injectable()
export class ListPoliciesUseCase {
  constructor(
    @Inject(GOVERNANCE_POLICY_REPOSITORY)
    private readonly policyRepository: GovernancePolicyRepositoryPort,
  ) {}

  async execute(
    filter: FindPoliciesFilter,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<GovernancePolicyAggregate>> {
    return this.policyRepository.list(filter, pagination);
  }
}

// Evaluate Governance
@Injectable()
export class EvaluateGovernanceUseCase {
  constructor(
    private readonly policyEnforcer: PolicyEnforcerService,
  ) {}

  async execute(
    context: PolicyEvaluationContext,
    policyCode?: string,
  ): Promise<EnforcementResult | GovernanceEvaluationResult> {
    if (policyCode) {
      return this.policyEnforcer.evaluatePolicy(policyCode, context);
    }
    return this.policyEnforcer.evaluate(context);
  }
}

// List Audit Logs
@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @Inject(GOVERNANCE_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: GovernanceAuditLogRepositoryPort,
  ) {}

  async execute(
    filter: FindAuditLogsFilter,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<GovernanceAuditLog>> {
    return this.auditLogRepository.list(filter, pagination);
  }
}
