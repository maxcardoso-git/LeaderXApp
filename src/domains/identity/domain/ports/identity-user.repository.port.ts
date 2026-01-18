import { IdentityUser } from '../aggregates';
import { TransactionContext, UserStatus } from '../value-objects';
import { PaginationOptions, PaginatedResult } from './common';

export interface FindUsersFilter {
  tenantId: string;
  status?: UserStatus;
  email?: string;
}

export interface IdentityUserRepositoryPort {
  findById(
    tenantId: string,
    userId: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null>;

  findByEmail(
    tenantId: string,
    email: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null>;

  findByExternalId(
    tenantId: string,
    externalId: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null>;

  list(
    filter: FindUsersFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<IdentityUser>>;

  create(user: IdentityUser, ctx?: TransactionContext): Promise<void>;

  update(user: IdentityUser, ctx?: TransactionContext): Promise<void>;

  existsByEmail(
    tenantId: string,
    email: string,
    excludeUserId?: string,
    ctx?: TransactionContext,
  ): Promise<boolean>;
}

export const IDENTITY_USER_REPOSITORY = Symbol('IDENTITY_USER_REPOSITORY');
