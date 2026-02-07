import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface ConciliationSummary {
  openAnomalies: number;
  ledgerWithoutApproval: number;
  approvedWithoutLedger: number;
  reversalsLast30Days: number;
  totalPosted: number;
  totalReversed: number;
}

export interface ConciliationAnomaly {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  description: string;
  relatedEntity: string;
  detectedAt: string;
  journeyCode?: string;
  journeyTrigger?: string;
  approvalRequestId?: string;
  ledgerEntryId?: string;
  technicalDetails?: string;
}

export interface PaginatedAnomaliesResult {
  items: ConciliationAnomaly[];
  page: number;
  size: number;
  total: number;
}

@Injectable()
export class ConciliationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string): Promise<ConciliationSummary> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      ledgerWithoutApproval,
      approvedWithoutLedger,
      reversalsLast30Days,
      totalPosted,
      totalReversed,
    ] = await Promise.all([
      // Entries with journeyCode but no approvalPolicyCode (should have been approved)
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          journeyCode: { not: null },
          approvalPolicyCode: null,
          status: 'POSTED',
        },
      }),
      // Count approval requests that don't have matching ledger entries
      // (approximation: entries with approvalRequestId that are REVERSED)
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          approvalRequestId: { not: null },
          status: 'REVERSED',
        },
      }),
      // Reversals in last 30 days
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          status: 'REVERSED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Total posted
      this.prisma.pointLedgerEntry.count({
        where: { tenantId, status: 'POSTED' },
      }),
      // Total reversed
      this.prisma.pointLedgerEntry.count({
        where: { tenantId, status: 'REVERSED' },
      }),
    ]);

    const openAnomalies = ledgerWithoutApproval + approvedWithoutLedger;

    return {
      openAnomalies,
      ledgerWithoutApproval,
      approvedWithoutLedger,
      reversalsLast30Days,
      totalPosted,
      totalReversed,
    };
  }

  async listAnomalies(
    tenantId: string,
    filters: {
      type?: string;
      severity?: string;
      status?: string;
      page?: number;
      size?: number;
    },
  ): Promise<PaginatedAnomaliesResult> {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;
    const anomalies: ConciliationAnomaly[] = [];

    // Detect anomaly type: LEDGER_WITHOUT_APPROVAL
    if (!filters.type || filters.type === 'LEDGER_WITHOUT_APPROVAL') {
      const entries = await this.prisma.pointLedgerEntry.findMany({
        where: {
          tenantId,
          journeyCode: { not: null },
          approvalPolicyCode: null,
          status: 'POSTED',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      for (const entry of entries) {
        anomalies.push({
          id: `LWA-${entry.id}`,
          type: 'LEDGER_WITHOUT_APPROVAL',
          severity: 'CRITICAL',
          status: 'OPEN',
          description: `Lançamento ${entry.entryType} de ${entry.amount} pontos sem política de aprovação`,
          relatedEntity: `LedgerEntry:${entry.id}`,
          detectedAt: entry.createdAt.toISOString(),
          journeyCode: entry.journeyCode ?? undefined,
          journeyTrigger: entry.journeyTrigger ?? undefined,
          ledgerEntryId: entry.id,
        });
      }
    }

    // Detect anomaly type: REVERSAL_OUTLIER (entries reversed very quickly)
    if (!filters.type || filters.type === 'REVERSAL_OUTLIER') {
      const reversedEntries = await this.prisma.pointLedgerEntry.findMany({
        where: {
          tenantId,
          status: 'REVERSED',
          reversedById: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const entry of reversedEntries) {
        anomalies.push({
          id: `RO-${entry.id}`,
          type: 'REVERSAL_OUTLIER',
          severity: 'WARNING',
          status: 'OPEN',
          description: `Lançamento ${entry.entryType} de ${entry.amount} pontos foi revertido`,
          relatedEntity: `LedgerEntry:${entry.id}`,
          detectedAt: entry.createdAt.toISOString(),
          journeyCode: entry.journeyCode ?? undefined,
          journeyTrigger: entry.journeyTrigger ?? undefined,
          ledgerEntryId: entry.id,
          technicalDetails: `Original entry reversed by ${entry.reversedById}`,
        });
      }
    }

    // Detect anomaly type: JOURNEY_WITHOUT_OUTCOME (entries without journeyCode)
    if (!filters.type || filters.type === 'JOURNEY_WITHOUT_OUTCOME') {
      const orphanEntries = await this.prisma.pointLedgerEntry.findMany({
        where: {
          tenantId,
          journeyCode: null,
          journeyTrigger: null,
          status: 'POSTED',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const entry of orphanEntries) {
        anomalies.push({
          id: `JWO-${entry.id}`,
          type: 'JOURNEY_WITHOUT_OUTCOME',
          severity: 'INFO',
          status: 'OPEN',
          description: `Lançamento ${entry.entryType} de ${entry.amount} pontos sem referência de jornada`,
          relatedEntity: `LedgerEntry:${entry.id}`,
          detectedAt: entry.createdAt.toISOString(),
          ledgerEntryId: entry.id,
        });
      }
    }

    // Filter by severity
    const filtered = anomalies.filter((a) => {
      if (filters.severity && a.severity !== filters.severity) return false;
      if (filters.status && a.status !== filters.status) return false;
      return true;
    });

    // Sort by detectedAt desc
    filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    const total = filtered.length;
    const items = filtered.slice(page * size, (page + 1) * size);

    return { items, page, size, total };
  }

  async getAnomaly(
    tenantId: string,
    anomalyId: string,
  ): Promise<ConciliationAnomaly | null> {
    // Parse anomaly ID to get the type prefix and entry ID
    const dashIndex = anomalyId.indexOf('-');
    if (dashIndex === -1) return null;

    const entryId = anomalyId.substring(dashIndex + 1);

    const entry = await this.prisma.pointLedgerEntry.findFirst({
      where: { id: entryId, tenantId },
    });

    if (!entry) return null;

    const prefix = anomalyId.substring(0, dashIndex);
    let type = 'UNKNOWN';
    let severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';
    let description = '';

    switch (prefix) {
      case 'LWA':
        type = 'LEDGER_WITHOUT_APPROVAL';
        severity = 'CRITICAL';
        description = `Lançamento ${entry.entryType} de ${entry.amount} pontos sem política de aprovação`;
        break;
      case 'RO':
        type = 'REVERSAL_OUTLIER';
        severity = 'WARNING';
        description = `Lançamento ${entry.entryType} de ${entry.amount} pontos foi revertido`;
        break;
      case 'JWO':
        type = 'JOURNEY_WITHOUT_OUTCOME';
        severity = 'INFO';
        description = `Lançamento ${entry.entryType} de ${entry.amount} pontos sem referência de jornada`;
        break;
    }

    return {
      id: anomalyId,
      type,
      severity,
      status: 'OPEN',
      description,
      relatedEntity: `LedgerEntry:${entry.id}`,
      detectedAt: entry.createdAt.toISOString(),
      journeyCode: entry.journeyCode ?? undefined,
      journeyTrigger: entry.journeyTrigger ?? undefined,
      approvalRequestId: entry.approvalRequestId ?? undefined,
      ledgerEntryId: entry.id,
      technicalDetails: JSON.stringify({
        entryType: entry.entryType,
        amount: entry.amount,
        status: entry.status,
        reasonCode: entry.reasonCode,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        journeyCode: entry.journeyCode,
        journeyTrigger: entry.journeyTrigger,
        approvalPolicyCode: entry.approvalPolicyCode,
        approvalRequestId: entry.approvalRequestId,
        reversedById: entry.reversedById,
        reversalOfId: entry.reversalOfId,
      }, null, 2),
    };
  }
}
