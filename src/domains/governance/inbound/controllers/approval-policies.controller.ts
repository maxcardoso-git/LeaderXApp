import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ApprovalService } from '../../application/services';

// ============================================
// DTOs & Types
// ============================================

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// APPROVAL POLICIES CONTROLLER
// ============================================

@ApiTags('Governance - Approval Policies')
@Controller('governance/approval-policies')
@ApiHeader({ name: 'X-Tenant-Id', required: false })
export class ApprovalPoliciesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval policy' })
  async create(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: {
      code: string;
      name: string;
      description?: string;
      entityType: string;
      action: string;
      operationScope?: any;
      conditions?: any;
      pipelineId: string;
      pipelineVersion?: number;
      blocking?: boolean;
      enabled?: boolean;
      priority?: number;
      createdBy?: string;
    },
  ) {
    // Validate pipeline exists
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: dto.pipelineId },
    });
    if (!pipeline) {
      throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check for duplicate code
    const existing = await this.prisma.govApprovalPolicy.findFirst({
      where: { code: dto.code },
    });
    if (existing) {
      throw new HttpException(
        { error: 'POLICY_CODE_EXISTS', message: 'A policy with this code already exists' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.govApprovalPolicy.create({
      data: {
        tenantId: tenantId || null,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        entityType: dto.entityType,
        action: dto.action,
        operationScope: dto.operationScope || {},
        conditions: dto.conditions || {},
        pipelineId: dto.pipelineId,
        pipelineVersion: dto.pipelineVersion || 1,
        blocking: dto.blocking ?? true,
        enabled: dto.enabled ?? true,
        priority: dto.priority ?? 100,
        createdBy: dto.createdBy || null,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List approval policies' })
  async list(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('enabled') enabled?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = {};

    // Filter by tenant (include global policies with null tenant)
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (enabled !== undefined) where.enabled = enabled === 'true';

    const [items, total] = await Promise.all([
      this.prisma.govApprovalPolicy.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.govApprovalPolicy.count({ where }),
    ]);

    // Enrich with pipeline info
    const pipelineIds = [...new Set(items.map((p) => p.pipelineId))];
    const pipelines = await this.prisma.plmPipeline.findMany({
      where: { id: { in: pipelineIds } },
      select: { id: true, name: true, key: true },
    });
    const pipelinesMap = new Map(pipelines.map((p) => [p.id, p]));

    const enrichedItems = items.map((item) => ({
      ...item,
      pipeline: pipelinesMap.get(item.pipelineId) || null,
    }));

    return { items: enrichedItems, page: Number(page), size: Number(size), total };
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Get available entity types for policies' })
  async getEntityTypes() {
    return [
      { value: 'MEMBER', label: 'Member' },
      { value: 'EVENT', label: 'Event' },
      { value: 'STRUCTURE', label: 'Structure' },
      { value: 'RESERVATION', label: 'Reservation' },
      { value: 'WORKING_UNIT', label: 'Working Unit' },
      { value: 'SUPPLIER', label: 'Supplier' },
      { value: 'PROGRAM', label: 'Program' },
      { value: 'CUSTOM', label: 'Custom' },
    ];
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get available actions for policies' })
  async getActions() {
    return [
      { value: 'CREATE', label: 'Create' },
      { value: 'UPDATE', label: 'Update' },
      { value: 'DELETE', label: 'Delete' },
      { value: 'INACTIVATE', label: 'Inactivate' },
      { value: 'ACTIVATE', label: 'Activate' },
    ];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval policy by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string) {
    const where: any = { id };
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    }

    const policy = await this.prisma.govApprovalPolicy.findFirst({ where });
    if (!policy) {
      throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Get pipeline info
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: policy.pipelineId },
      select: { id: true, name: true, key: true },
    });

    return { ...policy, pipeline };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update approval policy' })
  async update(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      description?: string;
      entityType?: string;
      action?: string;
      operationScope?: any;
      conditions?: any;
      pipelineId?: string;
      pipelineVersion?: number;
      blocking?: boolean;
      enabled?: boolean;
      priority?: number;
    },
  ) {
    const existing = await this.prisma.govApprovalPolicy.findFirst({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // If changing pipeline, validate it exists
    if (dto.pipelineId && dto.pipelineId !== existing.pipelineId) {
      const pipeline = await this.prisma.plmPipeline.findFirst({
        where: { id: dto.pipelineId },
      });
      if (!pipeline) {
        throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
    }

    return this.prisma.govApprovalPolicy.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        entityType: dto.entityType ?? existing.entityType,
        action: dto.action ?? existing.action,
        operationScope: dto.operationScope ?? existing.operationScope,
        conditions: dto.conditions ?? existing.conditions,
        pipelineId: dto.pipelineId ?? existing.pipelineId,
        pipelineVersion: dto.pipelineVersion ?? existing.pipelineVersion,
        blocking: dto.blocking !== undefined ? dto.blocking : existing.blocking,
        enabled: dto.enabled !== undefined ? dto.enabled : existing.enabled,
        priority: dto.priority ?? existing.priority,
      },
    });
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: 'Toggle policy enabled status' })
  async toggle(@Param('id') id: string) {
    const existing = await this.prisma.govApprovalPolicy.findFirst({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.govApprovalPolicy.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete approval policy' })
  async delete(@Param('id') id: string) {
    const existing = await this.prisma.govApprovalPolicy.findFirst({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check for active requests using this policy
    const activeRequests = await this.prisma.govApprovalRequest.count({
      where: { policyId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    if (activeRequests > 0) {
      throw new HttpException(
        { error: 'POLICY_HAS_ACTIVE_REQUESTS', message: `Policy has ${activeRequests} active request(s)` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.govApprovalPolicy.delete({ where: { id } });
    return existing;
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate approval policy' })
  async duplicate(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: { code?: string; name?: string },
  ) {
    const original = await this.prisma.govApprovalPolicy.findFirst({ where: { id } });
    if (!original) {
      throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const newCode = dto.code || `${original.code}_copy_${Date.now()}`;
    const newName = dto.name || `${original.name} (Copy)`;

    // Check code uniqueness
    const existing = await this.prisma.govApprovalPolicy.findFirst({
      where: { code: newCode },
    });
    if (existing) {
      throw new HttpException(
        { error: 'POLICY_CODE_EXISTS', message: 'A policy with this code already exists' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.govApprovalPolicy.create({
      data: {
        tenantId: tenantId || original.tenantId,
        code: newCode,
        name: newName,
        description: original.description,
        entityType: original.entityType,
        action: original.action,
        operationScope: original.operationScope || {},
        conditions: original.conditions || {},
        pipelineId: original.pipelineId,
        pipelineVersion: original.pipelineVersion,
        blocking: original.blocking,
        enabled: false, // Start disabled
        priority: original.priority,
      },
    });
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate policy match for a given context' })
  async simulate(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: {
      entityType: string;
      action: string;
      context?: any;
    },
  ) {
    // Find matching policies
    const where: any = {
      entityType: dto.entityType,
      action: dto.action,
      enabled: true,
    };

    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    }

    const policies = await this.prisma.govApprovalPolicy.findMany({
      where,
      orderBy: { priority: 'asc' },
    });

    if (policies.length === 0) {
      return {
        matched: false,
        message: 'No policy matches this entity type and action',
        policies: [],
      };
    }

    // In MVP, we match by entityType + action only (conditions evaluation is phase 2)
    const matchedPolicy = policies[0];

    // Get pipeline info
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: matchedPolicy.pipelineId },
      select: { id: true, name: true, key: true },
    });

    return {
      matched: true,
      policy: {
        id: matchedPolicy.id,
        code: matchedPolicy.code,
        name: matchedPolicy.name,
        blocking: matchedPolicy.blocking,
        priority: matchedPolicy.priority,
      },
      pipeline: pipeline,
      allMatchingPolicies: policies.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        priority: p.priority,
      })),
    };
  }
}

// ============================================
// APPROVAL REQUESTS CONTROLLER
// ============================================

@ApiTags('Governance - Approval Requests')
@Controller('governance/approval-requests')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class ApprovalRequestsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval request' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: {
      entityType: string;
      entityId: string;
      action: string;
      title?: string;
      description?: string;
      policyId?: string;
      context?: any;
      snapshot?: any;
      requestedBy?: string;
    },
  ) {
    // Use ApprovalService to create request with PLM card
    const result = await this.approvalService.createApprovalRequest({
      tenantId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      title: dto.title || `Aprovação: ${dto.action} ${dto.entityType}`,
      description: dto.description,
      policyId: dto.policyId,
      context: dto.context,
      snapshot: dto.snapshot,
      requestedBy: dto.requestedBy,
    });

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'List approval requests' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('policyId') policyId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (policyId) where.policyId = policyId;

    const [items, total] = await Promise.all([
      this.prisma.govApprovalRequest.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ requestedAt: 'desc' }],
        include: {
          policy: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.govApprovalRequest.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval request by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
      include: {
        policy: true,
        evidences: true,
        history: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return request;
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve request' })
  async approve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { decidedBy?: string; reason?: string },
  ) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Request cannot be approved in current status' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.govApprovalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decision: 'APPROVED',
        decidedBy: dto.decidedBy || null,
        decidedAt: new Date(),
        decisionReason: dto.reason || null,
      },
    });

    // Create history entry
    await this.prisma.govApprovalHistory.create({
      data: {
        tenantId,
        requestId: id,
        fromStatus: request.status,
        toStatus: 'APPROVED',
        changedBy: dto.decidedBy || null,
        comment: dto.reason || null,
      },
    });

    // TODO: Apply decision to origin entity (phase 2)

    return updated;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject request' })
  async reject(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { decidedBy?: string; reason?: string },
  ) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Request cannot be rejected in current status' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.govApprovalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decision: 'REJECTED',
        decidedBy: dto.decidedBy || null,
        decidedAt: new Date(),
        decisionReason: dto.reason || null,
      },
    });

    // Create history entry
    await this.prisma.govApprovalHistory.create({
      data: {
        tenantId,
        requestId: id,
        fromStatus: request.status,
        toStatus: 'REJECTED',
        changedBy: dto.decidedBy || null,
        comment: dto.reason || null,
      },
    });

    return updated;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel request' })
  async cancel(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { canceledBy?: string; reason?: string },
  ) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (request.status === 'APPROVED' || request.status === 'REJECTED') {
      throw new HttpException(
        { error: 'INVALID_STATUS', message: 'Request already has a final decision' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.govApprovalRequest.update({
      where: { id },
      data: {
        status: 'CANCELED',
      },
    });

    // Create history entry
    await this.prisma.govApprovalHistory.create({
      data: {
        tenantId,
        requestId: id,
        fromStatus: request.status,
        toStatus: 'CANCELED',
        changedBy: dto.canceledBy || null,
        comment: dto.reason || null,
      },
    });

    return updated;
  }

  // ============================================
  // EVIDENCE ENDPOINTS
  // ============================================

  @Post(':id/evidences')
  @ApiOperation({ summary: 'Add evidence to request' })
  async addEvidence(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: {
      type: string;
      title?: string;
      content?: string;
      attachmentUrl?: string;
      createdBy?: string;
      metadata?: any;
    },
  ) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.govApprovalEvidence.create({
      data: {
        tenantId,
        requestId: id,
        type: dto.type,
        title: dto.title || null,
        content: dto.content || null,
        attachmentUrl: dto.attachmentUrl || null,
        createdBy: dto.createdBy || null,
        metadata: dto.metadata || {},
      },
    });
  }

  @Get(':id/evidences')
  @ApiOperation({ summary: 'Get evidences for request' })
  async getEvidences(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.govApprovalEvidence.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete(':id/evidences/:evidenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete evidence' })
  async deleteEvidence(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    const evidence = await this.prisma.govApprovalEvidence.findFirst({
      where: { id: evidenceId, requestId: id, tenantId },
    });
    if (!evidence) {
      throw new HttpException({ error: 'EVIDENCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    await this.prisma.govApprovalEvidence.delete({ where: { id: evidenceId } });
    return evidence;
  }

  // ============================================
  // HISTORY ENDPOINT
  // ============================================

  @Get(':id/history')
  @ApiOperation({ summary: 'Get history for request' })
  async getHistory(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { id, tenantId },
    });
    if (!request) {
      throw new HttpException({ error: 'REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.govApprovalHistory.findMany({
      where: { requestId: id },
      orderBy: { changedAt: 'desc' },
    });
  }
}
