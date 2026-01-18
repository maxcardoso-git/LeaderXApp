import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  POINT_ACCOUNT_REPOSITORY,
  POINT_LEDGER_REPOSITORY,
  PointAccountRepositoryPort,
  PointLedgerRepositoryPort,
} from '../../domain';
import { GetStatementQuery } from '../queries';

export interface LedgerEntryItem {
  id: string;
  entryType: string;
  amount: number;
  reasonCode: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PagedLedgerResponse {
  meta: {
    page: number;
    size: number;
    total: number;
  };
  items: LedgerEntryItem[];
}

@Injectable()
export class GetStatementHandler {
  private readonly logger = new Logger(GetStatementHandler.name);

  constructor(
    @Inject(POINT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: PointAccountRepositoryPort,
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
  ) {}

  async execute(query: GetStatementQuery): Promise<PagedLedgerResponse> {
    this.logger.debug(
      `Getting statement for ${query.ownerType}:${query.ownerId}`,
    );

    // Find account
    const account = await this.accountRepo.findByOwner({
      tenantId: query.tenantId,
      ownerType: query.ownerType,
      ownerId: query.ownerId,
    });

    if (!account) {
      // Return empty statement for non-existent account
      return {
        meta: {
          page: query.page,
          size: query.size,
          total: 0,
        },
        items: [],
      };
    }

    // Get ledger entries
    const result = await this.ledgerRepo.listEntries(
      {
        tenantId: query.tenantId,
        accountId: account.id,
        entryType: query.entryType,
        referenceType: query.referenceType,
        referenceId: query.referenceId,
        from: query.from,
        to: query.to,
      },
      {
        page: query.page,
        size: query.size,
      },
    );

    return {
      meta: {
        page: result.page,
        size: result.size,
        total: result.total,
      },
      items: result.items.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        amount: entry.amount,
        reasonCode: entry.reasonCode,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        createdAt: entry.createdAt.toISOString(),
        metadata: entry.metadata,
      })),
    };
  }
}
