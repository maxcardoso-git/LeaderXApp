import { Controller, Post, Put, Get, Delete, Body, Param, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  EvaluateGovernanceDto,
  ListPoliciesQueryDto,
  ListAuditLogsQueryDto,
  PolicyResponseDto,
  EnforcementResultDto,
  EvaluationResultDto,
  AuditLogResponseDto,
  PaginatedResponseDto,
} from '../dtos';
import {
  CreatePolicyUseCase,
  UpdatePolicyUseCase,
  DeprecatePolicyUseCase,
  GetPolicyByIdUseCase,
  GetPolicyByCodeUseCase,
  ListPoliciesUseCase,
  EvaluateGovernanceUseCase,
  ListAuditLogsUseCase,
} from '../../application/usecases';
import { GovernancePolicyAggregate } from '../../domain/aggregates';
import { GovernanceAuditLog } from '../../domain/entities';
import { EnforcementResult, PolicyEnforcerService } from '../../domain/services';
import { GovernanceEvaluationResult, PolicyRules } from '../../domain/value-objects';

@ApiTags('Governance')
@Controller('governance')
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@ApiHeader({ name: 'X-Actor-Id', required: false })
export class GovernanceController {
  constructor(
    private readonly createPolicy: CreatePolicyUseCase,
    private readonly updatePolicy: UpdatePolicyUseCase,
    private readonly deprecatePolicy: DeprecatePolicyUseCase,
    private readonly getPolicyById: GetPolicyByIdUseCase,
    private readonly getPolicyByCode: GetPolicyByCodeUseCase,
    private readonly listPolicies: ListPoliciesUseCase,
    private readonly evaluateGovernance: EvaluateGovernanceUseCase,
    private readonly listAuditLogs: ListAuditLogsUseCase,
  ) {}

  private toPolicyResponse(policy: GovernancePolicyAggregate): PolicyResponseDto {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      code: policy.code,
      name: policy.name,
      description: policy.description,
      status: policy.status,
      scope: policy.scope,
      rules: policy.rules,
      version: policy.version,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private toAuditLogResponse(log: GovernanceAuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      tenantId: log.tenantId,
      policyCode: log.policyCode,
      policyId: log.policyId,
      decision: log.decision,
      context: log.context as unknown as Record<string, unknown>,
      reason: log.reason,
      evaluatedAt: log.evaluatedAt.toISOString(),
    };
  }

  @Post('policies')
  @ApiOperation({ summary: 'Create a new governance policy' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() dto: CreatePolicyDto,
  ): Promise<PolicyResponseDto> {
    const policy = await this.createPolicy.execute({
      tenantId: tenantId || undefined,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      rules: dto.rules as PolicyRules,
      actorId,
    });
    return this.toPolicyResponse(policy);
  }

  @Get('policies')
  @ApiOperation({ summary: 'List governance policies' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListPoliciesQueryDto,
  ): Promise<PaginatedResponseDto<PolicyResponseDto>> {
    const result = await this.listPolicies.execute(
      { tenantId, status: query.status, scope: query.scope, search: query.search },
      { page: query.page ?? 1, size: query.size ?? 25 },
    );

    return {
      items: result.items.map((p) => this.toPolicyResponse(p)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }

  @Get('policies/:policyId')
  @ApiOperation({ summary: 'Get policy by ID' })
  async getById(@Param('policyId') policyId: string): Promise<PolicyResponseDto> {
    const policy = await this.getPolicyById.execute(policyId);
    return this.toPolicyResponse(policy);
  }

  @Get('policies/by-code/:code')
  @ApiOperation({ summary: 'Get policy by code' })
  async getByCode(@Param('code') code: string): Promise<PolicyResponseDto> {
    const policy = await this.getPolicyByCode.execute(code);
    return this.toPolicyResponse(policy);
  }

  @Put('policies/:policyId')
  @ApiOperation({ summary: 'Update a governance policy' })
  async update(
    @Headers('x-actor-id') actorId: string,
    @Param('policyId') policyId: string,
    @Body() dto: UpdatePolicyDto,
  ): Promise<PolicyResponseDto> {
    const policy = await this.updatePolicy.execute({
      policyId,
      name: dto.name,
      description: dto.description,
      rules: dto.rules as PolicyRules | undefined,
      actorId,
    });
    return this.toPolicyResponse(policy);
  }

  @Delete('policies/:policyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deprecate a governance policy' })
  async deprecate(
    @Headers('x-actor-id') actorId: string,
    @Param('policyId') policyId: string,
  ): Promise<PolicyResponseDto> {
    const policy = await this.deprecatePolicy.execute({ policyId, actorId });
    return this.toPolicyResponse(policy);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate governance policies' })
  async evaluate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: EvaluateGovernanceDto,
  ): Promise<EnforcementResultDto | EvaluationResultDto> {
    const context = {
      ...dto.context,
      tenantId,
    };

    const result = await this.evaluateGovernance.execute(context, dto.policyCode);

    if ('finalDecision' in result) {
      // EnforcementResult
      return {
        finalDecision: result.finalDecision,
        evaluations: result.evaluations.map((e) => ({
          decision: e.decision,
          policyCode: e.policyCode,
          policyId: e.policyId,
          reason: e.reason,
          evaluatedAt: e.evaluatedAt.toISOString(),
        })),
        denyReasons: result.denyReasons,
      };
    } else {
      // GovernanceEvaluationResult
      return {
        decision: result.decision,
        policyCode: result.policyCode,
        policyId: result.policyId,
        reason: result.reason,
        evaluatedAt: result.evaluatedAt.toISOString(),
      };
    }
  }

  @Get('audit')
  @ApiOperation({ summary: 'List governance audit logs' })
  async listAudit(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const result = await this.listAuditLogs.execute(
      {
        tenantId,
        policyCode: query.policyCode,
        decision: query.decision,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
      { page: query.page ?? 1, size: query.size ?? 25 },
    );

    return {
      items: result.items.map((l) => this.toAuditLogResponse(l)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}
