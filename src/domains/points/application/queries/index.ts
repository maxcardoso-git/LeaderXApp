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
