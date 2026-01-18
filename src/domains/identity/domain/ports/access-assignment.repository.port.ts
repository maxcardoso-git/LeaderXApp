import { AccessAssignment } from '../aggregates';
import { TransactionContext, ScopeType, AssignmentStatus } from '../value-objects';

export interface FindAssignmentsFilter {
  tenantId: string;
  userId?: string;
  roleId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  status?: AssignmentStatus;
}

export interface AccessAssignmentRepositoryPort {
  findById(
    tenantId: string,
    assignmentId: string,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment | null>;

  findByUserAndRole(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment | null>;

  findActiveByUser(
    tenantId: string,
    userId: string,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment[]>;

  findByFilter(
    filter: FindAssignmentsFilter,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment[]>;

  create(assignment: AccessAssignment, ctx?: TransactionContext): Promise<void>;

  update(assignment: AccessAssignment, ctx?: TransactionContext): Promise<void>;

  existsActiveAssignment(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<boolean>;
}

export const ACCESS_ASSIGNMENT_REPOSITORY = Symbol('ACCESS_ASSIGNMENT_REPOSITORY');
