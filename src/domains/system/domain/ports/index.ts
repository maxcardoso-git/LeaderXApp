import { SystemResourceAggregate } from '../aggregates';
import { ResourceType, ResourceSubtype, ResourceEnvironment, ResourceStatus } from '../value-objects';

// Injection tokens
export const SYSTEM_RESOURCE_REPOSITORY = Symbol('SYSTEM_RESOURCE_REPOSITORY');

// Transaction context
export interface TransactionContext {
  tx: unknown;
}

// Pagination
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

// Find filter
export interface FindResourcesFilter {
  tenantId: string;
  type?: ResourceType;
  subtype?: ResourceSubtype;
  environment?: ResourceEnvironment;
  status?: ResourceStatus;
  search?: string;
}

// Repository port
export interface SystemResourceRepositoryPort {
  findById(id: string, ctx?: TransactionContext): Promise<SystemResourceAggregate | null>;
  findByName(tenantId: string, name: string, ctx?: TransactionContext): Promise<SystemResourceAggregate | null>;
  list(filter: FindResourcesFilter, pagination: PaginationOptions, ctx?: TransactionContext): Promise<PaginatedResult<SystemResourceAggregate>>;
  create(resource: SystemResourceAggregate, ctx?: TransactionContext): Promise<void>;
  update(resource: SystemResourceAggregate, ctx?: TransactionContext): Promise<void>;
  delete(id: string, ctx?: TransactionContext): Promise<void>;
}
