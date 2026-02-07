import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import {
  ToolDefinitionRepository,
  CreateToolDefinitionInput,
  UpdateToolDefinitionInput,
  McpToolDefinitionAggregate,
} from '../../outbound/repositories/tool-definition.repository';
import { ApprovalService } from '../../../governance/application/services/approval.service';
import { ToolRegistryService } from '../services/tool-registry.service';

@Injectable()
export class ManageToolDefinitionHandler {
  constructor(
    private readonly repo: ToolDefinitionRepository,
    private readonly approvalService: ApprovalService,
    private readonly registry: ToolRegistryService,
  ) {}

  async create(input: CreateToolDefinitionInput): Promise<McpToolDefinitionAggregate> {
    // Validate toolCode format
    if (!/^[A-Z][A-Z0-9_]*$/.test(input.toolCode)) {
      throw new HttpException(
        { error: 'INVALID_TOOL_CODE', message: 'Tool code must start with uppercase letter, contain only A-Z, 0-9, _' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check duplicate
    const existing = await this.repo.findByToolCode(input.toolCode);
    if (existing) {
      throw new HttpException(
        { error: 'DUPLICATE_TOOL_CODE', message: `Tool code '${input.toolCode}' already exists` },
        HttpStatus.CONFLICT,
      );
    }

    return this.repo.create(input);
  }

  async update(
    id: string,
    input: UpdateToolDefinitionInput,
  ): Promise<McpToolDefinitionAggregate> {
    const tool = await this.repo.findById(id);
    if (!tool) {
      throw new HttpException({ error: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (tool.status !== 'DRAFT') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Only DRAFT tools can be edited' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.repo.update(id, input);
  }

  async publish(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<{ tool: McpToolDefinitionAggregate; requiresApproval: boolean; approvalRequestId?: string }> {
    const tool = await this.repo.findById(id);
    if (!tool) {
      throw new HttpException({ error: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (tool.status !== 'DRAFT') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Only DRAFT tools can be published' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if approval is required
    const { requiresApproval } = await this.approvalService.checkRequiresApproval(
      tenantId,
      'MCP_TOOL',
      'PUBLISH',
    );

    if (!requiresApproval) {
      // Publish directly
      const updated = await this.repo.updateStatus(id, 'PUBLISHED', userId);
      await this.registry.reloadPublishedTools();
      return { tool: updated, requiresApproval: false };
    }

    // Create approval request
    const result = await this.approvalService.createApprovalRequest({
      tenantId,
      entityType: 'MCP_TOOL',
      entityId: id,
      action: 'PUBLISH',
      title: `Publish MCP Tool: ${tool.name}`,
      description: `Request to publish MCP tool '${tool.toolCode}' (${tool.description})`,
      snapshot: {
        toolCode: tool.toolCode,
        name: tool.name,
        category: tool.category,
        apiBinding: tool.apiBinding,
      },
      requestedBy: userId,
    });

    await this.repo.updateStatus(id, 'PENDING_APPROVAL', userId);
    await this.repo.setApprovalRequest(id, result.request.id);

    return {
      tool: { ...tool, status: 'PENDING_APPROVAL', approvalRequestId: result.request.id },
      requiresApproval: true,
      approvalRequestId: result.request.id,
    };
  }

  async deprecate(id: string, userId: string): Promise<McpToolDefinitionAggregate> {
    const tool = await this.repo.findById(id);
    if (!tool) {
      throw new HttpException({ error: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (tool.status !== 'PUBLISHED') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Only PUBLISHED tools can be deprecated' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.repo.updateStatus(id, 'DEPRECATED', userId);
    await this.registry.reloadPublishedTools();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const tool = await this.repo.findById(id);
    if (!tool) {
      throw new HttpException({ error: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (tool.status !== 'DRAFT') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Only DRAFT tools can be deleted' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repo.delete(id);
  }
}
