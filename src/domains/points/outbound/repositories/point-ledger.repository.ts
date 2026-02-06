import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  PointLedgerEntry,
  Reference,
  LedgerEntryType,
  LedgerEntryStatus,
  JourneyReference,
  PointLedgerRepositoryPort,
  ListLedgerEntriesFilter,
  ListLedgerEntriesByMemberFilter,
  LedgerPaginationOptions,
  PaginatedLedgerResult,
  BalanceAggregates,
  TransactionContext,
} from '../../domain';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PointLedgerRepository implements PointLedgerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return ctx?.tx as PrismaClient ?? this.prisma;
  }

  async appendEntry(
    entry: PointLedgerEntry,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointLedgerEntry.create({
      data: {
        id: entry.id,
        tenantId: entry.tenantId,
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount,
        reasonCode: entry.reasonCode,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        idempotencyKey: entry.idempotencyKey,
        metadata: entry.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
        createdAt: entry.createdAt,
        status: entry.status,
        journeyCode: entry.journeyReference?.journeyCode,
        journeyTrigger: entry.journeyReference?.journeyTrigger,
        approvalPolicyCode: entry.journeyReference?.approvalPolicyCode,
        approvalRequestId: entry.journeyReference?.approvalRequestId,
        sourceEventId: entry.journeyReference?.sourceEventId,
        reversedById: entry.reversedById,
        reversalOfId: entry.reversalOfId,
      },
    });
  }

  async findById(
    tenantId: string,
    entryId: string,
    ctx?: TransactionContext,
  ): Promise<PointLedgerEntry | null> {
    const client = this.getClient(ctx);

    const record = await client.pointLedgerEntry.findFirst({
      where: { id: entryId, tenantId },
    });

    return record ? this.toDomain(record) : null;
  }

  async updateStatus(
    entry: PointLedgerEntry,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointLedgerEntry.update({
      where: { id: entry.id },
      data: {
        status: entry.status,
        reversedById: entry.reversedById,
      },
    });
  }

  async listEntries(
    filter: ListLedgerEntriesFilter,
    pagination: LedgerPaginationOptions,
  ): Promise<PaginatedLedgerResult> {
    const where: Prisma.PointLedgerEntryWhereInput = {
      tenantId: filter.tenantId,
      accountId: filter.accountId,
      ...(filter.entryType && { entryType: filter.entryType }),
      ...(filter.referenceType && { referenceType: filter.referenceType }),
      ...(filter.referenceId && { referenceId: filter.referenceId }),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from && { gte: filter.from }),
              ...(filter.to && { lte: filter.to }),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.pointLedgerEntry.findMany({
        where,
        skip: pagination.page * pagination.size,
        take: pagination.size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pointLedgerEntry.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async listEntriesByMember(
    filter: ListLedgerEntriesByMemberFilter,
    pagination: LedgerPaginationOptions,
  ): Promise<PaginatedLedgerResult> {
    const where: Prisma.PointLedgerEntryWhereInput = {
      tenantId: filter.tenantId,
      ...(filter.memberId && {
        account: {
          ownerType: 'USER',
          ownerId: filter.memberId,
        },
      }),
      ...(filter.entryType && { entryType: filter.entryType }),
      ...(filter.status && { status: filter.status }),
      ...(filter.journeyCode && { journeyCode: filter.journeyCode }),
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom && { gte: filter.dateFrom }),
              ...(filter.dateTo && { lte: filter.dateTo }),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.pointLedgerEntry.findMany({
        where,
        skip: pagination.page * pagination.size,
        take: pagination.size,
        orderBy: { createdAt: 'desc' },
        include: { account: true },
      }),
      this.prisma.pointLedgerEntry.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async getBalanceAggregates(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<BalanceAggregates> {
    const client = this.getClient(ctx);

    // Use raw query for efficient aggregation — only count POSTED entries
    const result = await client.$queryRaw<
      Array<{
        entry_type: string;
        total: bigint;
      }>
    >`
      SELECT entry_type, COALESCE(SUM(amount), 0) as total
      FROM point_ledger_entries
      WHERE tenant_id = ${tenantId}
        AND account_id = ${accountId}
        AND status = 'POSTED'
      GROUP BY entry_type
    `;

    const aggregates: BalanceAggregates = {
      credits: 0,
      debits: 0,
      commits: 0,
      reversals: 0,
    };

    for (const row of result) {
      const total = Number(row.total);
      switch (row.entry_type) {
        case LedgerEntryType.CREDIT:
          aggregates.credits = total;
          break;
        case LedgerEntryType.DEBIT:
          aggregates.debits = total;
          break;
        case LedgerEntryType.COMMIT:
          aggregates.commits = total;
          break;
        case LedgerEntryType.REVERSAL:
          aggregates.reversals = total;
          break;
      }
    }

    return aggregates;
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    accountId: string;
    entryType: string;
    amount: number;
    reasonCode: string;
    referenceType: string;
    referenceId: string;
    idempotencyKey: string | null;
    metadata: unknown;
    createdAt: Date;
    status?: string | null;
    journeyCode?: string | null;
    journeyTrigger?: string | null;
    approvalPolicyCode?: string | null;
    approvalRequestId?: string | null;
    sourceEventId?: string | null;
    reversedById?: string | null;
    reversalOfId?: string | null;
  }): PointLedgerEntry {
    return PointLedgerEntry.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      accountId: record.accountId,
      entryType: record.entryType as LedgerEntryType,
      amount: record.amount,
      reasonCode: record.reasonCode,
      reference: Reference.create(record.referenceType, record.referenceId),
      idempotencyKey: record.idempotencyKey ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      createdAt: record.createdAt,
      status: (record.status as LedgerEntryStatus) ?? LedgerEntryStatus.POSTED,
      journeyReference: record.journeyCode && record.journeyTrigger
        ? JourneyReference.create(
            record.journeyCode,
            record.journeyTrigger,
            record.approvalPolicyCode ?? undefined,
            record.approvalRequestId ?? undefined,
            record.sourceEventId ?? undefined,
          )
        : undefined,
      reversedById: record.reversedById ?? undefined,
      reversalOfId: record.reversalOfId ?? undefined,
    });
  }
}
