import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  SystemResourceRepositoryPort,
  FindResourcesFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
} from '../../domain/ports';
import { SystemResourceAggregate } from '../../domain/aggregates';
import {
  ResourceType,
  ResourceSubtype,
  HttpMethod,
  AuthMode,
  ResourceStatus,
  ResourceEnvironment,
  ApiKeyConfig,
  BearerTokenConfig,
  BasicAuthConfig,
  OAuth2Config,
  LLMConfig,
} from '../../domain/value-objects';

@Injectable()
export class SystemResourceRepository implements SystemResourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext) {
    return ctx?.tx ?? this.prisma;
  }

  async findById(id: string, ctx?: TransactionContext): Promise<SystemResourceAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const record = await client.systemResource.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByName(tenantId: string, name: string, ctx?: TransactionContext): Promise<SystemResourceAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const record = await client.systemResource.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async list(
    filter: FindResourcesFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<SystemResourceAggregate>> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const where: Prisma.SystemResourceWhereInput = {
      tenantId: filter.tenantId,
    };

    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.subtype) {
      where.subtype = filter.subtype;
    }
    if (filter.environment) {
      where.environment = filter.environment;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { endpoint: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      client.systemResource.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { createdAt: 'desc' },
      }),
      client.systemResource.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: pagination.page,
      size: pagination.size,
    };
  }

  async create(resource: SystemResourceAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = resource.toPersistence();

    await client.systemResource.create({
      data: {
        id: data.id as string,
        tenantId: data.tenantId as string,
        name: data.name as string,
        type: data.type as string,
        subtype: data.subtype as string,
        endpoint: data.endpoint as string,
        httpMethod: data.httpMethod as string,
        authMode: data.authMode as string,
        apiKeyConfig: data.apiKeyConfig as Prisma.InputJsonValue | undefined,
        bearerConfig: data.bearerConfig as Prisma.InputJsonValue | undefined,
        basicAuthConfig: data.basicAuthConfig as Prisma.InputJsonValue | undefined,
        oauth2Config: data.oauth2Config as Prisma.InputJsonValue | undefined,
        llmConfig: data.llmConfig as Prisma.InputJsonValue | undefined,
        connection: data.connection as Prisma.InputJsonValue | undefined,
        configuration: data.configuration as Prisma.InputJsonValue | undefined,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        tags: data.tags as string[],
        environment: data.environment as string,
        status: data.status as string,
        lastTestedAt: data.lastTestedAt as Date | undefined,
      },
    });
  }

  async update(resource: SystemResourceAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = resource.toPersistence();

    await client.systemResource.update({
      where: { id: data.id as string },
      data: {
        name: data.name as string,
        type: data.type as string,
        subtype: data.subtype as string,
        endpoint: data.endpoint as string,
        httpMethod: data.httpMethod as string,
        authMode: data.authMode as string,
        apiKeyConfig: data.apiKeyConfig as Prisma.InputJsonValue | undefined,
        bearerConfig: data.bearerConfig as Prisma.InputJsonValue | undefined,
        basicAuthConfig: data.basicAuthConfig as Prisma.InputJsonValue | undefined,
        oauth2Config: data.oauth2Config as Prisma.InputJsonValue | undefined,
        llmConfig: data.llmConfig as Prisma.InputJsonValue | undefined,
        connection: data.connection as Prisma.InputJsonValue | undefined,
        configuration: data.configuration as Prisma.InputJsonValue | undefined,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        tags: data.tags as string[],
        environment: data.environment as string,
        status: data.status as string,
        lastTestedAt: data.lastTestedAt as Date | undefined,
        updatedAt: data.updatedAt as Date,
      },
    });
  }

  async delete(id: string, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    await client.systemResource.delete({ where: { id } });
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    name: string;
    type: string;
    subtype: string;
    endpoint: string;
    httpMethod: string;
    authMode: string;
    apiKeyConfig: unknown;
    bearerConfig: unknown;
    basicAuthConfig: unknown;
    oauth2Config: unknown;
    llmConfig: unknown;
    connection: unknown;
    configuration: unknown;
    metadata: unknown;
    tags: string[];
    environment: string;
    status: string;
    lastTestedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SystemResourceAggregate {
    return SystemResourceAggregate.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      type: record.type as ResourceType,
      subtype: record.subtype as ResourceSubtype,
      endpoint: record.endpoint,
      httpMethod: record.httpMethod as HttpMethod,
      authMode: record.authMode as AuthMode,
      apiKeyConfig: record.apiKeyConfig as ApiKeyConfig | undefined,
      bearerConfig: record.bearerConfig as BearerTokenConfig | undefined,
      basicAuthConfig: record.basicAuthConfig as BasicAuthConfig | undefined,
      oauth2Config: record.oauth2Config as OAuth2Config | undefined,
      llmConfig: record.llmConfig as LLMConfig | undefined,
      connection: record.connection as Record<string, unknown> | undefined,
      configuration: record.configuration as Record<string, unknown> | undefined,
      metadata: record.metadata as Record<string, unknown> | undefined,
      tags: record.tags,
      environment: record.environment as ResourceEnvironment,
      status: record.status as ResourceStatus,
      lastTestedAt: record.lastTestedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
