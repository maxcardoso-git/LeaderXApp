import { GovernancePolicyAggregate } from '../aggregates';
import { GovernanceAuditLog } from '../entities';
import { PolicyStatus, PolicyScope, GovernanceDecision } from '../value-objects';

export interface TransactionContext {
  tx: unknown;
}

export interface PaginationOptions {
  page: number;
  size: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

// Policy Repository Port
export interface FindPoliciesFilter {
  tenantId?: string;
  status?: PolicyStatus;
  scope?: PolicyScope;
  search?: string;
}

export interface GovernancePolicyRepositoryPort {
  findById(id: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null>;
  findByCode(code: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null>;
  findActiveByCode(code: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null>;
  findAllActive(tenantId?: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate[]>;
  list(filter: FindPoliciesFilter, pagination: PaginationOptions, ctx?: TransactionContext): Promise<PaginatedResult<GovernancePolicyAggregate>>;
  create(policy: GovernancePolicyAggregate, ctx?: TransactionContext): Promise<void>;
  update(policy: GovernancePolicyAggregate, ctx?: TransactionContext): Promise<void>;
}

export const GOVERNANCE_POLICY_REPOSITORY = Symbol('GOVERNANCE_POLICY_REPOSITORY');

// Audit Log Repository Port
export interface FindAuditLogsFilter {
  tenantId: string;
  policyCode?: string;
  decision?: GovernanceDecision;
  startDate?: Date;
  endDate?: Date;
}

export interface GovernanceAuditLogRepositoryPort {
  create(log: GovernanceAuditLog, ctx?: TransactionContext): Promise<void>;
  list(filter: FindAuditLogsFilter, pagination: PaginationOptions, ctx?: TransactionContext): Promise<PaginatedResult<GovernanceAuditLog>>;
}

export const GOVERNANCE_AUDIT_LOG_REPOSITORY = Symbol('GOVERNANCE_AUDIT_LOG_REPOSITORY');

// Identity Read Port (for resolving actor roles)
export interface ActorInfo {
  actorId: string;
  roles: string[];
  tenantId: string;
}

export interface IdentityReadPort {
  getActorInfo(tenantId: string, actorId: string): Promise<ActorInfo | null>;
}

export const IDENTITY_READ_PORT = Symbol('IDENTITY_READ_PORT');
