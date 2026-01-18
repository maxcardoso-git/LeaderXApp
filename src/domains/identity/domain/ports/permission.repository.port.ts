import { Permission } from '../entities';
import { TransactionContext } from '../value-objects';
import { PaginationOptions, PaginatedResult } from './common';

export interface FindPermissionsFilter {
  tenantId: string;
  category?: string;
  search?: string;
}

export interface PermissionRepositoryPort {
  findById(
    tenantId: string,
    permissionId: string,
    ctx?: TransactionContext,
  ): Promise<Permission | null>;

  findByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<Permission | null>;

  findByIds(
    tenantId: string,
    permissionIds: string[],
    ctx?: TransactionContext,
  ): Promise<Permission[]>;

  findByCodes(
    tenantId: string,
    codes: string[],
    ctx?: TransactionContext,
  ): Promise<Permission[]>;

  list(
    filter: FindPermissionsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Permission>>;

  create(permission: Permission, ctx?: TransactionContext): Promise<void>;

  existsByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<boolean>;
}

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');
