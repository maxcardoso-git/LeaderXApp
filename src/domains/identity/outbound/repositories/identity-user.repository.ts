import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IdentityUser,
  IdentityUserRepositoryPort,
  FindUsersFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
  UserStatus,
} from '../../domain';

@Injectable()
export class IdentityUserRepository implements IdentityUserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    tenantId: string,
    userId: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.identityUser.findFirst({
      where: { id: userId, tenantId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByEmail(
    tenantId: string,
    email: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.identityUser.findFirst({
      where: { tenantId, email: email.toLowerCase() },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByExternalId(
    tenantId: string,
    externalId: string,
    ctx?: TransactionContext,
  ): Promise<IdentityUser | null> {
    const client = ctx?.tx ?? this.prisma;

    const record = await client.identityUser.findFirst({
      where: { tenantId, externalId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async list(
    filter: FindUsersFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<IdentityUser>> {
    const client = ctx?.tx ?? this.prisma;

    const where: any = { tenantId: filter.tenantId };
    if (filter.status) where.status = filter.status;
    if (filter.email) where.email = { contains: filter.email.toLowerCase() };

    const [records, total] = await Promise.all([
      client.identityUser.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { createdAt: 'desc' },
      }),
      client.identityUser.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async create(user: IdentityUser, ctx?: TransactionContext): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.identityUser.create({
      data: {
        id: user.id,
        tenantId: user.tenantId,
        externalId: user.externalId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }

  async update(user: IdentityUser, ctx?: TransactionContext): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.identityUser.update({
      where: { id: user.id },
      data: {
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });
  }

  async delete(tenantId: string, userId: string, ctx?: TransactionContext): Promise<void> {
    const client = ctx?.tx ?? this.prisma;

    await client.identityUser.deleteMany({
      where: { id: userId, tenantId },
    });
  }

  async existsByEmail(
    tenantId: string,
    email: string,
    excludeUserId?: string,
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const client = ctx?.tx ?? this.prisma;

    const where: any = { tenantId, email: email.toLowerCase() };
    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const count = await client.identityUser.count({ where });
    return count > 0;
  }

  private toDomain(record: any): IdentityUser {
    return IdentityUser.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      externalId: record.externalId ?? undefined,
      email: record.email ?? undefined,
      fullName: record.fullName ?? undefined,
      status: record.status as UserStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
