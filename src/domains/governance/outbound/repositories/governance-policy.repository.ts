import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  GovernancePolicyRepositoryPort,
  FindPoliciesFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
} from '../../domain/ports';
import { GovernancePolicyAggregate } from '../../domain/aggregates';
import { PolicyStatus, PolicyScope, PolicyRules } from '../../domain/value-objects';

@Injectable()
export class GovernancePolicyRepository implements GovernancePolicyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext) {
    return ctx?.tx ?? this.prisma;
  }

  async findById(id: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const record = await client.governancePolicy.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCode(code: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const record = await client.governancePolicy.findUnique({ where: { code } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findActiveByCode(code: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const record = await client.governancePolicy.findFirst({
      where: { code, status: PolicyStatus.ACTIVE },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAllActive(tenantId?: string, ctx?: TransactionContext): Promise<GovernancePolicyAggregate[]> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const records = await client.governancePolicy.findMany({
      where: {
        status: PolicyStatus.ACTIVE,
        OR: [
          { scope: PolicyScope.GLOBAL },
          { scope: PolicyScope.TENANT, tenantId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async list(
    filter: FindPoliciesFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<GovernancePolicyAggregate>> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const where: Record<string, unknown> = {};

    if (filter.tenantId) {
      where.OR = [
        { scope: PolicyScope.GLOBAL },
        { tenantId: filter.tenantId },
      ];
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.scope) {
      where.scope = filter.scope;
    }
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      client.governancePolicy.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { createdAt: 'desc' },
      }),
      client.governancePolicy.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: pagination.page,
      size: pagination.size,
    };
  }

  async create(policy: GovernancePolicyAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = policy.toPersistence();

    await client.governancePolicy.create({
      data: {
        id: data.id as string,
        tenantId: data.tenantId as string | undefined,
        code: data.code as string,
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        scope: data.scope as string,
        rules: data.rules as Prisma.InputJsonValue,
        version: data.version as number,
      },
    });
  }

  async update(policy: GovernancePolicyAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = policy.toPersistence();

    await client.governancePolicy.update({
      where: { id: data.id as string },
      data: {
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        rules: data.rules as Prisma.InputJsonValue,
        version: data.version as number,
        updatedAt: data.updatedAt as Date,
      },
    });
  }

  private toDomain(record: {
    id: string;
    tenantId: string | null;
    code: string;
    name: string;
    description: string | null;
    status: string;
    scope: string;
    rules: unknown;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): GovernancePolicyAggregate {
    return GovernancePolicyAggregate.reconstitute({
      id: record.id,
      tenantId: record.tenantId ?? undefined,
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      status: record.status as PolicyStatus,
      scope: record.scope as PolicyScope,
      rules: record.rules as PolicyRules,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
