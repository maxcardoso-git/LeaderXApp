import { Approval } from '../entities/approval.entity';
import { ApprovalId } from '../value-objects';

export interface FindApprovalsFilter {
  tenantId: string;
  orgId: string;
  cycleId?: string;
  state?: string;
  type?: string;
  priority?: string;
  candidateId?: string;
  searchQuery?: string;
}

export interface PaginationOptions {
  page: number;
  size: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/**
 * Approval Repository Port (Interface)
 *
 * This is the port that the domain uses to persist and retrieve approvals.
 * The actual implementation (adapter) is in the infrastructure layer.
 */
export interface ApprovalRepositoryPort {
  /**
   * Save an approval (create or update)
   */
  save(approval: Approval): Promise<void>;

  /**
   * Find an approval by ID
   */
  findById(id: ApprovalId, tenantId: string): Promise<Approval | null>;

  /**
   * Find approvals with filters and pagination
   */
  findMany(
    filter: FindApprovalsFilter,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<Approval>>;

  /**
   * Find multiple approvals by IDs
   */
  findByIds(ids: ApprovalId[], tenantId: string): Promise<Approval[]>;

  /**
   * Check if an approval exists
   */
  exists(id: ApprovalId, tenantId: string): Promise<boolean>;

  /**
   * Delete an approval (soft delete)
   */
  delete(id: ApprovalId, tenantId: string): Promise<void>;
}

/**
 * Injection token for the repository
 */
export const APPROVAL_REPOSITORY = Symbol('ApprovalRepositoryPort');
