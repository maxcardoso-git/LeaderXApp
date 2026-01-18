import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  IPointsReadPort,
  PointsSummary,
  PointTransaction,
} from '../../domain/ports';

@Injectable()
export class PointsReadAdapter implements IPointsReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getLedgerSummary(tenantId: string): Promise<PointsSummary | null> {
    const [totalAccounts, activeAccounts, activeHolds] = await Promise.all([
      this.prisma.pointAccount.count({
        where: { tenantId },
      }),
      this.prisma.pointAccount.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      this.prisma.pointHold.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
    ]);

    // Calculate total balance from ledger entries
    const balanceResult = await this.prisma.pointLedgerEntry.groupBy({
      by: ['entryType'],
      where: { tenantId },
      _sum: { amount: true },
    });

    let totalBalance = 0;
    for (const entry of balanceResult) {
      if (entry.entryType === 'CREDIT') {
        totalBalance += entry._sum.amount || 0;
      } else if (entry.entryType === 'DEBIT' || entry.entryType === 'COMMIT') {
        totalBalance -= entry._sum.amount || 0;
      }
    }

    return {
      totalAccounts,
      activeAccounts,
      totalBalance,
      totalHolds: activeHolds,
    };
  }

  async getRecentTransactions(tenantId: string, limit: number): Promise<PointTransaction[]> {
    const records = await this.prisma.pointLedgerEntry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        accountId: true,
        entryType: true,
        amount: true,
        createdAt: true,
      },
    });

    return records.map((r) => ({
      accountId: r.accountId,
      entryType: r.entryType,
      amount: r.amount,
      createdAt: r.createdAt,
    }));
  }
}
