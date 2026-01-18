import { PointAccount } from '../entities';
import { PointLedgerEntry } from '../entities';
import { PointHold } from '../entities';
import { Balance, OwnerType, LedgerEntryType, HoldStatus } from '../value-objects';

// ============================================
// Transaction Context
// ============================================

/**
 * Transaction context for unit of work pattern
 */
export interface TransactionContext {
  // Opaque transaction handle
  readonly tx: unknown;
}

// ============================================
// Point Account Repository
// ============================================

export interface FindAccountFilter {
  tenantId: string;
  ownerType: OwnerType;
  ownerId: string;
}

export interface PointAccountRepositoryPort {
  findByOwner(
    filter: FindAccountFilter,
    ctx?: TransactionContext,
  ): Promise<PointAccount | null>;

  findById(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<PointAccount | null>;

  create(account: PointAccount, ctx?: TransactionContext): Promise<void>;

  update(account: PointAccount, ctx?: TransactionContext): Promise<void>;

  /**
   * Acquire exclusive lock on account for the transaction
   * Used for concurrency control during balance-sensitive operations
   */
  lockForUpdate(
    tenantId: string,
    accountId: string,
    ctx: TransactionContext,
  ): Promise<void>;
}

export const POINT_ACCOUNT_REPOSITORY = Symbol('PointAccountRepositoryPort');

// ============================================
// Point Ledger Repository
// ============================================

export interface ListLedgerEntriesFilter {
  tenantId: string;
  accountId: string;
  entryType?: LedgerEntryType;
  referenceType?: string;
  referenceId?: string;
  from?: Date;
  to?: Date;
}

export interface LedgerPaginationOptions {
  page: number;
  size: number;
}

export interface PaginatedLedgerResult {
  items: PointLedgerEntry[];
  page: number;
  size: number;
  total: number;
}

export interface BalanceAggregates {
  credits: number;
  debits: number;
  commits: number;
  reversals: number;
}

export interface PointLedgerRepositoryPort {
  appendEntry(entry: PointLedgerEntry, ctx?: TransactionContext): Promise<void>;

  listEntries(
    filter: ListLedgerEntriesFilter,
    pagination: LedgerPaginationOptions,
  ): Promise<PaginatedLedgerResult>;

  /**
   * Get aggregated sums for balance calculation
   */
  getBalanceAggregates(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<BalanceAggregates>;
}

export const POINT_LEDGER_REPOSITORY = Symbol('PointLedgerRepositoryPort');

// ============================================
// Point Hold Repository
// ============================================

export interface PointHoldRepositoryPort {
  findActiveHoldByReference(
    tenantId: string,
    accountId: string,
    referenceType: string,
    referenceId: string,
    ctx?: TransactionContext,
  ): Promise<PointHold | null>;

  findHoldByReference(
    tenantId: string,
    accountId: string,
    referenceType: string,
    referenceId: string,
    ctx?: TransactionContext,
  ): Promise<PointHold | null>;

  create(hold: PointHold, ctx?: TransactionContext): Promise<void>;

  updateStatus(hold: PointHold, ctx?: TransactionContext): Promise<void>;

  /**
   * Get total amount of active holds for an account
   */
  getActiveHoldsTotal(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<number>;
}

export const POINT_HOLD_REPOSITORY = Symbol('PointHoldRepositoryPort');

// ============================================
// Idempotency Repository
// ============================================

export interface IdempotencyResult {
  isNew: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  responseBody?: unknown;
}

export interface IdempotencyRepositoryPort {
  /**
   * Try to begin an idempotent operation
   * Returns existing result if key exists
   */
  tryBegin(
    scope: string,
    tenantId: string,
    key: string,
    requestHash: string,
    ctx?: TransactionContext,
  ): Promise<IdempotencyResult>;

  /**
   * Mark operation as completed with response
   */
  complete(
    scope: string,
    tenantId: string,
    key: string,
    responseBody: unknown,
    ctx?: TransactionContext,
  ): Promise<void>;

  /**
   * Mark operation as failed
   */
  fail(
    scope: string,
    tenantId: string,
    key: string,
    errorBody: unknown,
    ctx?: TransactionContext,
  ): Promise<void>;
}

export const IDEMPOTENCY_REPOSITORY = Symbol('IdempotencyRepositoryPort');

// ============================================
// Outbox Repository
// ============================================

export interface OutboxEventData {
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface OutboxRepositoryPort {
  enqueue(event: OutboxEventData, ctx?: TransactionContext): Promise<string>;

  pullPending(batchSize: number): Promise<
    Array<{
      id: string;
      eventType: string;
      payload: Record<string, unknown>;
      tenantId: string;
    }>
  >;

  markPublished(id: string): Promise<void>;

  markFailed(id: string, nextAttemptAt: Date): Promise<void>;
}

export const OUTBOX_REPOSITORY = Symbol('OutboxRepositoryPort');

// ============================================
// Clock Provider
// ============================================

export interface ClockPort {
  now(): Date;
}

export const CLOCK = Symbol('ClockPort');

// ============================================
// UUID Generator
// ============================================

export interface UuidGeneratorPort {
  generate(): string;
}

export const UUID_GENERATOR = Symbol('UuidGeneratorPort');

// ============================================
// Unit of Work
// ============================================

export interface UnitOfWorkPort {
  /**
   * Execute operations within a transaction
   */
  execute<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UnitOfWorkPort');
