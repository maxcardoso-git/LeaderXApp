import { Role } from '../aggregates';
import { RolePermission } from '../entities';
import { TransactionContext } from '../value-objects';
import { PaginationOptions, PaginatedResult } from './common';

export interface FindRolesFilter {
  tenantId: string;
  search?: string;
}

export interface RoleRepositoryPort {
  findById(
    tenantId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<Role | null>;

  findByIdWithPermissions(
    tenantId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<Role | null>;

  findByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<Role | null>;

  findByIds(
    tenantId: string,
    roleIds: string[],
    ctx?: TransactionContext,
  ): Promise<Role[]>;

  findByIdsWithPermissions(
    tenantId: string,
    roleIds: string[],
    ctx?: TransactionContext,
  ): Promise<Role[]>;

  list(
    filter: FindRolesFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Role>>;

  create(role: Role, ctx?: TransactionContext): Promise<void>;

  update(role: Role, ctx?: TransactionContext): Promise<void>;

  existsByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<boolean>;

  // Role Permission operations
  upsertPermissions(
    roleId: string,
    permissions: RolePermission[],
    ctx?: TransactionContext,
  ): Promise<void>;

  findRolePermissions(
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<RolePermission[]>;
}

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
