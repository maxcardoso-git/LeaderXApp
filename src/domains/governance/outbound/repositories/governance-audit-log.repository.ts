import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  GovernanceAuditLogRepositoryPort,
  FindAuditLogsFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
} from '../../domain/ports';
import { GovernanceAuditLog } from '../../domain/entities';
import { GovernanceDecision, PolicyEvaluationContext } from '../../domain/value-objects';

@Injectable()
export class GovernanceAuditLogRepository implements GovernanceAuditLogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext) {
    return ctx?.tx ?? this.prisma;
  }

  async create(log: GovernanceAuditLog, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = log.toPersistence();

    await client.governanceAuditLog.create({
      data: {
        id: data.id as string,
        tenantId: data.tenantId as string,
        policyCode: data.policyCode as string,
        policyId: data.policyId as string | undefined,
        decision: data.decision as string,
        context: data.context as Prisma.InputJsonValue,
        reason: data.reason as string | undefined,
        evaluatedAt: data.evaluatedAt as Date,
      },
    });
  }

  async list(
    filter: FindAuditLogsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<GovernanceAuditLog>> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const where: Record<string, unknown> = {
      tenantId: filter.tenantId,
    };

    if (filter.policyCode) {
      where.policyCode = filter.policyCode;
    }
    if (filter.decision) {
      where.decision = filter.decision;
    }
    if (filter.startDate || filter.endDate) {
      where.evaluatedAt = {};
      if (filter.startDate) {
        (where.evaluatedAt as Record<string, unknown>).gte = filter.startDate;
      }
      if (filter.endDate) {
        (where.evaluatedAt as Record<string, unknown>).lte = filter.endDate;
      }
    }

    const [records, total] = await Promise.all([
      client.governanceAuditLog.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { evaluatedAt: 'desc' },
      }),
      client.governanceAuditLog.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: pagination.page,
      size: pagination.size,
    };
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    policyCode: string;
    policyId: string | null;
    decision: string;
    context: unknown;
    reason: string | null;
    evaluatedAt: Date;
    createdAt: Date;
  }): GovernanceAuditLog {
    return GovernanceAuditLog.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      policyCode: record.policyCode,
      policyId: record.policyId ?? undefined,
      decision: record.decision as GovernanceDecision,
      context: record.context as PolicyEvaluationContext,
      reason: record.reason ?? undefined,
      evaluatedAt: record.evaluatedAt,
      createdAt: record.createdAt,
    });
  }
}
