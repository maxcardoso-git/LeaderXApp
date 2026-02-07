import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { McpTool } from '../../domain/types';

export interface McpToolDefinitionAggregate {
  id: string;
  tenantId: string;
  toolCode: string;
  name: string;
  description: string;
  category: string;
  visibility: string;
  apiBinding: {
    serviceCode: string;
    method: string;
    path: string;
  };
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  guardrails: {
    noWrite: boolean;
    noApproval: boolean;
    noEventEmission: boolean;
    timeoutMs: number;
  };
  audit: {
    enabled: boolean;
    level: string;
  };
  status: string;
  version: number;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  approvalRequestId: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateToolDefinitionInput {
  tenantId: string;
  toolCode: string;
  name: string;
  description: string;
  category: string;
  visibility?: string;
  serviceCode: string;
  method: string;
  path: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  noWrite?: boolean;
  noApproval?: boolean;
  noEventEmission?: boolean;
  timeoutMs?: number;
  auditEnabled?: boolean;
  auditLevel?: string;
  createdBy: string;
}

export interface UpdateToolDefinitionInput {
  name?: string;
  description?: string;
  category?: string;
  visibility?: string;
  serviceCode?: string;
  method?: string;
  path?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  noWrite?: boolean;
  noApproval?: boolean;
  noEventEmission?: boolean;
  timeoutMs?: number;
  auditEnabled?: boolean;
  auditLevel?: string;
  updatedBy: string;
}

@Injectable()
export class ToolDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateToolDefinitionInput): Promise<McpToolDefinitionAggregate> {
    const record = await this.prisma.mcpToolDefinition.create({
      data: {
        tenantId: input.tenantId,
        toolCode: input.toolCode,
        name: input.name,
        description: input.description,
        category: input.category,
        visibility: input.visibility || 'INTERNAL',
        serviceCode: input.serviceCode,
        method: input.method,
        path: input.path,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        noWrite: input.noWrite ?? true,
        noApproval: input.noApproval ?? false,
        noEventEmission: input.noEventEmission ?? false,
        timeoutMs: input.timeoutMs ?? 5000,
        auditEnabled: input.auditEnabled ?? true,
        auditLevel: input.auditLevel || 'BASIC',
        createdBy: input.createdBy,
      },
    });
    return this.mapToAggregate(record);
  }

  async update(id: string, input: UpdateToolDefinitionInput): Promise<McpToolDefinitionAggregate> {
    const data: any = { updatedBy: input.updatedBy };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.serviceCode !== undefined) data.serviceCode = input.serviceCode;
    if (input.method !== undefined) data.method = input.method;
    if (input.path !== undefined) data.path = input.path;
    if (input.inputSchema !== undefined) data.inputSchema = input.inputSchema;
    if (input.outputSchema !== undefined) data.outputSchema = input.outputSchema;
    if (input.noWrite !== undefined) data.noWrite = input.noWrite;
    if (input.noApproval !== undefined) data.noApproval = input.noApproval;
    if (input.noEventEmission !== undefined) data.noEventEmission = input.noEventEmission;
    if (input.timeoutMs !== undefined) data.timeoutMs = input.timeoutMs;
    if (input.auditEnabled !== undefined) data.auditEnabled = input.auditEnabled;
    if (input.auditLevel !== undefined) data.auditLevel = input.auditLevel;

    const record = await this.prisma.mcpToolDefinition.update({
      where: { id },
      data,
    });
    return this.mapToAggregate(record);
  }

  async findById(id: string): Promise<McpToolDefinitionAggregate | null> {
    const record = await this.prisma.mcpToolDefinition.findUnique({ where: { id } });
    return record ? this.mapToAggregate(record) : null;
  }

  async findByToolCode(toolCode: string): Promise<McpToolDefinitionAggregate | null> {
    const record = await this.prisma.mcpToolDefinition.findUnique({ where: { toolCode } });
    return record ? this.mapToAggregate(record) : null;
  }

  async findByTenant(
    tenantId: string,
    filters?: { status?: string; category?: string; search?: string },
  ): Promise<McpToolDefinitionAggregate[]> {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { toolCode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const records = await this.prisma.mcpToolDefinition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapToAggregate(r));
  }

  async findPublished(): Promise<McpToolDefinitionAggregate[]> {
    const records = await this.prisma.mcpToolDefinition.findMany({
      where: { status: 'PUBLISHED' },
    });
    return records.map((r) => this.mapToAggregate(r));
  }

  async updateStatus(
    id: string,
    status: string,
    updatedBy: string,
  ): Promise<McpToolDefinitionAggregate> {
    const data: any = { status, updatedBy };
    if (status === 'PUBLISHED') data.publishedAt = new Date();
    if (status === 'DEPRECATED') data.deprecatedAt = new Date();

    const record = await this.prisma.mcpToolDefinition.update({
      where: { id },
      data,
    });
    return this.mapToAggregate(record);
  }

  async setApprovalRequest(id: string, approvalRequestId: string): Promise<void> {
    await this.prisma.mcpToolDefinition.update({
      where: { id },
      data: { approvalRequestId },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mcpToolDefinition.delete({ where: { id } });
  }

  private mapToAggregate(record: any): McpToolDefinitionAggregate {
    return {
      id: record.id,
      tenantId: record.tenantId,
      toolCode: record.toolCode,
      name: record.name,
      description: record.description,
      category: record.category,
      visibility: record.visibility,
      apiBinding: {
        serviceCode: record.serviceCode,
        method: record.method,
        path: record.path,
      },
      inputSchema: record.inputSchema as Record<string, any>,
      outputSchema: record.outputSchema as Record<string, any>,
      guardrails: {
        noWrite: record.noWrite,
        noApproval: record.noApproval,
        noEventEmission: record.noEventEmission,
        timeoutMs: record.timeoutMs,
      },
      audit: {
        enabled: record.auditEnabled,
        level: record.auditLevel,
      },
      status: record.status,
      version: record.version,
      publishedAt: record.publishedAt,
      deprecatedAt: record.deprecatedAt,
      approvalRequestId: record.approvalRequestId,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  toMcpTool(aggregate: McpToolDefinitionAggregate): McpTool {
    return {
      toolCode: aggregate.toolCode,
      name: aggregate.name,
      description: aggregate.description,
      category: aggregate.category,
      apiBinding: aggregate.apiBinding,
      inputSchema: aggregate.inputSchema,
      outputSchema: aggregate.outputSchema,
      guardrails: aggregate.guardrails,
      audit: {
        enabled: aggregate.audit.enabled,
        fields: [],
      },
    };
  }
}
