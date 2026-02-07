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

// Notification types config from spec
const NOTIFICATION_CONFIG: Record<string, {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  persistent: boolean;
  requiresAck: boolean;
  autoResolve: boolean;
}> = {
  LEDGER_WITHOUT_APPROVAL: {
    code: 'LEDGER_WITHOUT_APPROVAL',
    severity: 'CRITICAL',
    title: 'Lançamento de pontos sem aprovação',
    description: 'Foi detectado um lançamento no Ledger que exige aprovação, mas não possui Approval Request associado.',
    persistent: true,
    requiresAck: true,
    autoResolve: false,
  },
  APPROVAL_WITHOUT_LEDGER: {
    code: 'APPROVAL_WITHOUT_LEDGER',
    severity: 'WARNING',
    title: 'Aprovação sem lançamento no Ledger',
    description: 'Uma aprovação foi concluída, mas não foi identificado lançamento correspondente no Ledger dentro do SLA.',
    persistent: true,
    requiresAck: true,
    autoResolve: false,
  },
  JOURNEY_WITHOUT_OUTCOME: {
    code: 'JOURNEY_WITHOUT_OUTCOME',
    severity: 'INFO',
    title: 'Evento de jornada sem consequência',
    description: 'Um trigger de jornada ocorreu, mas não gerou aprovação nem lançamento de pontos.',
    persistent: false,
    requiresAck: false,
    autoResolve: true,
  },
  REVERSAL_OUTLIER: {
    code: 'REVERSAL_OUTLIER',
    severity: 'WARNING',
    title: 'Padrão anômalo de reversões',
    description: 'Foi detectado um volume atípico de reversões de pontos para um mesmo operador ou trigger.',
    persistent: true,
    requiresAck: true,
    autoResolve: false,
  },
  INTEGRATION_ERRORS: {
    code: 'INTEGRATION_ERRORS',
    severity: 'INFO',
    title: 'Erros técnicos recorrentes',
    description: 'Foram detectadas falhas técnicas recorrentes na integração de Pontos / Ledger.',
    persistent: false,
    requiresAck: false,
    autoResolve: true,
  },
};

export interface ConciliationNotification {
  id: string;
  tenantId: string;
  code: string;
  severity: string;
  title: string;
  description: string;
  anomalyId: string;
  anomalyType: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  persistent: boolean;
  requiresAck: boolean;
  autoResolve: boolean;
  link: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface PaginatedNotificationsResult {
  items: ConciliationNotification[];
  page: number;
  size: number;
  total: number;
}

export interface NotificationCountResult {
  total: number;
  new: number;
  acknowledged: number;
  resolved: number;
}

@Injectable()
export class ConciliationHandler {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Summary ──────────────────────────────────────────────

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
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          journeyCode: { not: null },
          approvalPolicyCode: null,
          status: 'POSTED',
        },
      }),
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          approvalRequestId: { not: null },
          status: 'REVERSED',
        },
      }),
      this.prisma.pointLedgerEntry.count({
        where: {
          tenantId,
          status: 'REVERSED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.pointLedgerEntry.count({
        where: { tenantId, status: 'POSTED' },
      }),
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

  // ─── Anomalies ────────────────────────────────────────────

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

    const filtered = anomalies.filter((a) => {
      if (filters.severity && a.severity !== filters.severity) return false;
      if (filters.status && a.status !== filters.status) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    const total = filtered.length;
    const items = filtered.slice(page * size, (page + 1) * size);

    return { items, page, size, total };
  }

  async getAnomaly(
    tenantId: string,
    anomalyId: string,
  ): Promise<ConciliationAnomaly | null> {
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

  // ─── Notifications ────────────────────────────────────────

  /**
   * Sync notifications: detect anomalies and upsert notifications.
   * - Creates NEW notifications for newly detected anomalies.
   * - Auto-resolves notifications for autoResolve types when anomaly is no longer detected.
   */
  async syncNotifications(tenantId: string): Promise<{ created: number; autoResolved: number }> {
    const anomalies = await this.listAnomalies(tenantId, { size: 200 });
    const detectedAnomalyIds = new Set(anomalies.items.map((a) => a.id));

    let created = 0;

    // Upsert notifications for each detected anomaly
    for (const anomaly of anomalies.items) {
      const config = NOTIFICATION_CONFIG[anomaly.type];
      if (!config) continue;

      const existing = await this.prisma.conciliationNotification.findUnique({
        where: { tenantId_anomalyId: { tenantId, anomalyId: anomaly.id } },
      });

      if (!existing) {
        await this.prisma.conciliationNotification.create({
          data: {
            tenantId,
            code: config.code,
            severity: config.severity,
            title: config.title,
            description: anomaly.description,
            anomalyId: anomaly.id,
            anomalyType: anomaly.type,
            status: 'NEW',
            persistent: config.persistent,
            requiresAck: config.requiresAck,
            autoResolve: config.autoResolve,
            link: `/conciliation/${anomaly.id}`,
          },
        });
        created++;
      }
    }

    // Auto-resolve: find notifications with autoResolve=true whose anomaly is no longer detected
    let autoResolved = 0;
    const autoResolveNotifications = await this.prisma.conciliationNotification.findMany({
      where: {
        tenantId,
        autoResolve: true,
        status: { not: 'RESOLVED' },
      },
    });

    for (const notif of autoResolveNotifications) {
      if (!detectedAnomalyIds.has(notif.anomalyId)) {
        await this.prisma.conciliationNotification.update({
          where: { id: notif.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: 'SYSTEM',
          },
        });
        autoResolved++;
      }
    }

    return { created, autoResolved };
  }

  async listNotifications(
    tenantId: string,
    filters: {
      status?: string;
      code?: string;
      severity?: string;
      page?: number;
      size?: number;
    },
  ): Promise<PaginatedNotificationsResult> {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.code) where.code = filters.code;
    if (filters.severity) where.severity = filters.severity;

    const [items, total] = await Promise.all([
      this.prisma.conciliationNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.conciliationNotification.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        tenantId: n.tenantId,
        code: n.code,
        severity: n.severity,
        title: n.title,
        description: n.description,
        anomalyId: n.anomalyId,
        anomalyType: n.anomalyType,
        status: n.status as 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED',
        persistent: n.persistent,
        requiresAck: n.requiresAck,
        autoResolve: n.autoResolve,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
        acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
        acknowledgedBy: n.acknowledgedBy,
        resolvedAt: n.resolvedAt?.toISOString() ?? null,
        resolvedBy: n.resolvedBy,
      })),
      page,
      size,
      total,
    };
  }

  async getNotificationCounts(tenantId: string): Promise<NotificationCountResult> {
    const [total, newCount, acknowledged, resolved] = await Promise.all([
      this.prisma.conciliationNotification.count({ where: { tenantId } }),
      this.prisma.conciliationNotification.count({ where: { tenantId, status: 'NEW' } }),
      this.prisma.conciliationNotification.count({ where: { tenantId, status: 'ACKNOWLEDGED' } }),
      this.prisma.conciliationNotification.count({ where: { tenantId, status: 'RESOLVED' } }),
    ]);

    return { total, new: newCount, acknowledged, resolved };
  }

  async getNotification(
    tenantId: string,
    notificationId: string,
  ): Promise<ConciliationNotification | null> {
    const n = await this.prisma.conciliationNotification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!n) return null;

    return {
      id: n.id,
      tenantId: n.tenantId,
      code: n.code,
      severity: n.severity,
      title: n.title,
      description: n.description,
      anomalyId: n.anomalyId,
      anomalyType: n.anomalyType,
      status: n.status as 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED',
      persistent: n.persistent,
      requiresAck: n.requiresAck,
      autoResolve: n.autoResolve,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
      acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: n.acknowledgedBy,
      resolvedAt: n.resolvedAt?.toISOString() ?? null,
      resolvedBy: n.resolvedBy,
    };
  }

  async acknowledgeNotification(
    tenantId: string,
    notificationId: string,
    userId: string,
  ): Promise<ConciliationNotification | null> {
    const n = await this.prisma.conciliationNotification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!n || n.status !== 'NEW') return null;

    const updated = await this.prisma.conciliationNotification.update({
      where: { id: notificationId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      severity: updated.severity,
      title: updated.title,
      description: updated.description,
      anomalyId: updated.anomalyId,
      anomalyType: updated.anomalyType,
      status: updated.status as 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED',
      persistent: updated.persistent,
      requiresAck: updated.requiresAck,
      autoResolve: updated.autoResolve,
      link: updated.link,
      createdAt: updated.createdAt.toISOString(),
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: updated.acknowledgedBy,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      resolvedBy: updated.resolvedBy,
    };
  }

  async resolveNotification(
    tenantId: string,
    notificationId: string,
    userId: string,
  ): Promise<ConciliationNotification | null> {
    const n = await this.prisma.conciliationNotification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!n || n.status === 'RESOLVED') return null;

    const updated = await this.prisma.conciliationNotification.update({
      where: { id: notificationId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      severity: updated.severity,
      title: updated.title,
      description: updated.description,
      anomalyId: updated.anomalyId,
      anomalyType: updated.anomalyType,
      status: updated.status as 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED',
      persistent: updated.persistent,
      requiresAck: updated.requiresAck,
      autoResolve: updated.autoResolve,
      link: updated.link,
      createdAt: updated.createdAt.toISOString(),
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: updated.acknowledgedBy,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      resolvedBy: updated.resolvedBy,
    };
  }
}
