import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Permission,
  PermissionRepositoryPort,
  FindPermissionsFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
} from '../../domain';

@Injectable()
export class PermissionRepository implements PermissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    tenantId: string,
    permissionId: string,
    ctx?: TransactionContext,
  ): Promise<Permission | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.permission.findFirst({
      where: { id: permissionId, tenantId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<Permission | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.permission.findFirst({
      where: { tenantId, code: code.toUpperCase() },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByIds(
    tenantId: string,
    permissionIds: string[],
    ctx?: TransactionContext,
  ): Promise<Permission[]> {
    const client = ctx?.tx ?? this.prisma;

    const records = await client.permission.findMany({
      where: { tenantId, id: { in: permissionIds } },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByCodes(
    tenantId: string,
    codes: string[],
    ctx?: TransactionContext,
  ): Promise<Permission[]> {
    const client = ctx?.tx ?? this.prisma;

    const upperCodes = codes.map((c) => c.toUpperCase());
    const records = await client.permission.findMany({
      where: { tenantId, code: { in: upperCodes } },
    });

    return records.map((r) => this.toDomain(r));
  }

  async list(
    filter: FindPermissionsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Permission>> {
    const client = ctx?.tx ?? this.prisma;

    const where: any = { tenantId: filter.tenantId };
    if (filter.category) where.category = filter.category;
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search.toUpperCase() } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      client.permission.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { code: 'asc' },
      }),
      client.permission.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async create(
    permission: Permission,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.permission.create({
      data: {
        id: permission.id,
        tenantId: permission.tenantId,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        category: permission.category,
        createdAt: permission.createdAt,
      },
    });
  }

  async existsByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const client = ctx?.tx ?? this.prisma;

    const count = await client.permission.count({
      where: { tenantId, code: code.toUpperCase() },
    });
    return count > 0;
  }

  private toDomain(record: any): Permission {
    return Permission.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      category: record.category ?? undefined,
      createdAt: record.createdAt,
    });
  }
}
