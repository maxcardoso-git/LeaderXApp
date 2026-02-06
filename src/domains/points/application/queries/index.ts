import { OwnerType, LedgerEntryType } from '../../domain';

/**
 * Get balance for an account
 */
export class GetBalanceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
  ) {}
}

/**
 * Get statement (ledger entries) for an account
 */
export class GetStatementQuery {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly page: number = 0,
    public readonly size: number = 20,
    public readonly from?: Date,
    public readonly to?: Date,
    public readonly entryType?: LedgerEntryType,
    public readonly referenceType?: string,
    public readonly referenceId?: string,
  ) {}
}

/**
 * List ledger entries (admin read-only, by member)
 */
export class ListLedgerEntriesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 0,
    public readonly size: number = 20,
    public readonly memberId?: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
    public readonly entryType?: LedgerEntryType,
    public readonly status?: string,
    public readonly journeyCode?: string,
  ) {}
}

/**
 * Get a single ledger entry by ID (admin read-only)
 */
export class GetLedgerEntryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly entryId: string,
  ) {}
}

/**
 * Get derived balance for a member
 */
export class GetMemberBalanceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly memberId: string,
  ) {}
}
