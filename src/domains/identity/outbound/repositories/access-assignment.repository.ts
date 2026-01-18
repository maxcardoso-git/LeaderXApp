import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  AccessAssignment,
  AccessAssignmentRepositoryPort,
  FindAssignmentsFilter,
  TransactionContext,
  ScopeType,
  AssignmentStatus,
} from '../../domain';

@Injectable()
export class AccessAssignmentRepository
  implements AccessAssignmentRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    tenantId: string,
    assignmentId: string,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.accessAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByUserAndRole(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.accessAssignment.findFirst({
      where: {
        tenantId,
        userId,
        roleId,
        scopeType,
        scopeId: scopeId ?? null,
        status: AssignmentStatus.ACTIVE,
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findActiveByUser(
    tenantId: string,
    userId: string,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment[]> {
    const client = ctx?.tx ?? this.prisma;

    const records = await client.accessAssignment.findMany({
      where: {
        tenantId,
        userId,
        status: AssignmentStatus.ACTIVE,
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByFilter(
    filter: FindAssignmentsFilter,
    ctx?: TransactionContext,
  ): Promise<AccessAssignment[]> {
    const client = ctx?.tx ?? this.prisma;

    const where: any = { tenantId: filter.tenantId };
    if (filter.userId) where.userId = filter.userId;
    if (filter.roleId) where.roleId = filter.roleId;
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.scopeId !== undefined) where.scopeId = filter.scopeId;
    if (filter.status) where.status = filter.status;

    const records = await client.accessAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async create(
    assignment: AccessAssignment,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.accessAssignment.create({
      data: {
        id: assignment.id,
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
        status: assignment.status,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        revokedAt: assignment.revokedAt,
        metadata: assignment.metadata as any,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      },
    });
  }

  async update(
    assignment: AccessAssignment,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.accessAssignment.update({
      where: { id: assignment.id },
      data: {
        status: assignment.status,
        revokedAt: assignment.revokedAt,
        updatedAt: assignment.updatedAt,
      },
    });
  }

  async existsActiveAssignment(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const client = ctx?.tx ?? this.prisma;

    const count = await client.accessAssignment.count({
      where: {
        tenantId,
        userId,
        roleId,
        scopeType,
        scopeId: scopeId ?? null,
        status: AssignmentStatus.ACTIVE,
      },
    });

    return count > 0;
  }

  private toDomain(record: any): AccessAssignment {
    return AccessAssignment.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      userId: record.userId,
      roleId: record.roleId,
      scopeType: record.scopeType as ScopeType,
      scopeId: record.scopeId ?? undefined,
      status: record.status as AssignmentStatus,
      assignedBy: record.assignedBy ?? undefined,
      assignedAt: record.assignedAt,
      revokedAt: record.revokedAt ?? undefined,
      metadata: record.metadata as Record<string, unknown> | undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
