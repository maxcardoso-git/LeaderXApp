import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Role,
  RolePermission,
  RoleRepositoryPort,
  FindRolesFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
  RoleEffect,
} from '../../domain';

@Injectable()
export class RoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    tenantId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<Role | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByIdWithPermissions(
    tenantId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<Role | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.role.findFirst({
      where: { id: roleId, tenantId },
      include: { rolePermissions: true },
    });

    if (!record) return null;

    const role = this.toDomain(record);
    const permissions = record.rolePermissions.map((rp) =>
      RolePermission.reconstitute({
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        effect: rp.effect as RoleEffect,
      }),
    );
    role.loadPermissions(permissions);

    return role;
  }

  async findByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<Role | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.role.findFirst({
      where: { tenantId, code: code.toUpperCase() },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByIds(
    tenantId: string,
    roleIds: string[],
    ctx?: TransactionContext,
  ): Promise<Role[]> {
    const client = ctx?.tx ?? this.prisma;

    const records = await client.role.findMany({
      where: { tenantId, id: { in: roleIds } },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByIdsWithPermissions(
    tenantId: string,
    roleIds: string[],
    ctx?: TransactionContext,
  ): Promise<Role[]> {
    const client = ctx?.tx ?? this.prisma;

    const records = await client.role.findMany({
      where: { tenantId, id: { in: roleIds } },
      include: { rolePermissions: true },
    });

    return records.map((record) => {
      const role = this.toDomain(record);
      const permissions = record.rolePermissions.map((rp) =>
        RolePermission.reconstitute({
          roleId: rp.roleId,
          permissionId: rp.permissionId,
          effect: rp.effect as RoleEffect,
        }),
      );
      role.loadPermissions(permissions);
      return role;
    });
  }

  async list(
    filter: FindRolesFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Role>> {
    const client = ctx?.tx ?? this.prisma;

    const where: any = { tenantId: filter.tenantId };
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search.toUpperCase() } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      client.role.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { name: 'asc' },
      }),
      client.role.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async create(role: Role, ctx?: TransactionContext): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.role.create({
      data: {
        id: role.id,
        tenantId: role.tenantId,
        code: role.code,
        name: role.name,
        description: role.description,
        effect: role.effect,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  }

  async update(role: Role, ctx?: TransactionContext): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.role.update({
      where: { id: role.id },
      data: {
        name: role.name,
        description: role.description,
        updatedAt: role.updatedAt,
      },
    });
  }

  async existsByCode(
    tenantId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const client = ctx?.tx ?? this.prisma;

    const count = await client.role.count({
      where: { tenantId, code: code.toUpperCase() },
    });
    return count > 0;
  }

  async upsertPermissions(
    roleId: string,
    permissions: RolePermission[],
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    // Delete all existing permissions for this role
    await client.rolePermission.deleteMany({
      where: { roleId },
    });

    // Insert new permissions
    if (permissions.length > 0) {
      await client.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: p.roleId,
          permissionId: p.permissionId,
          effect: p.effect,
        })),
      });
    }
  }

  async findRolePermissions(
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<RolePermission[]> {
    const client = ctx?.tx ?? this.prisma;

    const records = await client.rolePermission.findMany({
      where: { roleId },
    });

    return records.map((rp) =>
      RolePermission.reconstitute({
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        effect: rp.effect as RoleEffect,
      }),
    );
  }

  private toDomain(record: any): Role {
    return Role.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      effect: record.effect as RoleEffect,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      permissions: [],
    });
  }
}
