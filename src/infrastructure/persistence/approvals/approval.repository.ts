import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Approval,
  ApprovalId,
  ApprovalState,
  Priority,
  ApprovalRepositoryPort,
  FindApprovalsFilter,
  PaginationOptions,
  PaginatedResult,
} from '@domain/approvals';

@Injectable()
export class ApprovalRepository implements ApprovalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(approval: Approval): Promise<void> {
    const data = {
      id: approval.id.toString(),
      type: approval.type,
      state: approval.state.toString(),
      candidateId: approval.candidateId,
      candidateName: approval.candidateName,
      priority: approval.priority.toString(),
      tenantId: approval.tenantId,
      orgId: approval.orgId,
      cycleId: approval.cycleId,
      metadata: (approval.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      decidedAt: approval.decidedAt,
      decidedBy: approval.decidedBy,
      decisionReason: approval.decisionReason,
      updatedAt: approval.updatedAt,
    };

    await this.prisma.approval.upsert({
      where: { id: approval.id.toString() },
      create: {
        ...data,
        createdAt: approval.createdAt,
      },
      update: data,
    });
  }

  async findById(id: ApprovalId, tenantId: string): Promise<Approval | null> {
    const record = await this.prisma.approval.findFirst({
      where: {
        id: id.toString(),
        tenantId,
        deletedAt: null,
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findMany(
    filter: FindApprovalsFilter,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<Approval>> {
    const where = {
      tenantId: filter.tenantId,
      orgId: filter.orgId,
      deletedAt: null,
      ...(filter.cycleId && { cycleId: filter.cycleId }),
      ...(filter.state && { state: filter.state }),
      ...(filter.type && { type: filter.type }),
      ...(filter.priority && { priority: filter.priority }),
      ...(filter.candidateId && { candidateId: filter.candidateId }),
      ...(filter.searchQuery && {
        OR: [
          { candidateName: { contains: filter.searchQuery, mode: 'insensitive' as const } },
          { type: { contains: filter.searchQuery, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [records, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        skip: pagination.page * pagination.size,
        take: pagination.size,
        orderBy: this.parseSort(pagination.sort),
      }),
      this.prisma.approval.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      page: pagination.page,
      size: pagination.size,
      total,
      totalPages: Math.ceil(total / pagination.size),
    };
  }

  async findByIds(ids: ApprovalId[], tenantId: string): Promise<Approval[]> {
    const records = await this.prisma.approval.findMany({
      where: {
        id: { in: ids.map((id) => id.toString()) },
        tenantId,
        deletedAt: null,
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  async exists(id: ApprovalId, tenantId: string): Promise<boolean> {
    const count = await this.prisma.approval.count({
      where: {
        id: id.toString(),
        tenantId,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async delete(id: ApprovalId, tenantId: string): Promise<void> {
    await this.prisma.approval.update({
      where: { id: id.toString() },
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    type: string;
    state: string;
    candidateId: string;
    candidateName: string | null;
    priority: string;
    tenantId: string;
    orgId: string;
    cycleId: string | null;
    metadata: unknown;
    decidedAt: Date | null;
    decidedBy: string | null;
    decisionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Approval {
    return Approval.reconstitute({
      id: ApprovalId.fromString(record.id),
      type: record.type,
      state: ApprovalState.fromString(record.state),
      candidateId: record.candidateId,
      candidateName: record.candidateName ?? undefined,
      priority: Priority.fromString(record.priority),
      tenantId: record.tenantId,
      orgId: record.orgId,
      cycleId: record.cycleId ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      decidedAt: record.decidedAt ?? undefined,
      decidedBy: record.decidedBy ?? undefined,
      decisionReason: record.decisionReason ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private parseSort(sort?: string): { [key: string]: 'asc' | 'desc' } {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(',');
    return { [field]: (direction?.toLowerCase() as 'asc' | 'desc') || 'desc' };
  }
}
