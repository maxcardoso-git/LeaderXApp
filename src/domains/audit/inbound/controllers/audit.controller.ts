import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  RunComplianceChecksDto,
  GenerateReportDto,
  ListChecksQueryDto,
  ComplianceCheckResponseDto,
  ComplianceExecutionResponseDto,
  ComplianceReportResponseDto,
  ComplianceResultResponseDto,
  EvidenceItemDto,
  SearchAuditLogsDto,
  AuditLogResponseDto,
  PagedAuditLogsResponseDto,
  CreateAuditLogDto,
  CreateAuditLogResponseDto,
} from '../dtos';
import {
  ListComplianceChecksUseCase,
  RunComplianceChecksUseCase,
  GenerateComplianceReportUseCase,
  GetLatestComplianceReportUseCase,
  GetComplianceReportByIdUseCase,
  SearchAuditLogsUseCase,
  GetAuditLogByIdUseCase,
  CreateAuditLogUseCase,
} from '../../application/usecases';
import { ComplianceCheckAggregate, ComplianceReportAggregate } from '../../domain/aggregates';
import { ComplianceCheckResultEntity } from '../../domain/entities';
import { ComplianceExecutionResult } from '../../domain/services';
import { ComplianceRules, EvidenceItem } from '../../domain/value-objects';

@ApiTags('Audit & Compliance')
@Controller('audit')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Actor-Id', required: false })
export class AuditController {
  constructor(
    private readonly listChecks: ListComplianceChecksUseCase,
    private readonly runChecks: RunComplianceChecksUseCase,
    private readonly generateReport: GenerateComplianceReportUseCase,
    private readonly getLatestReport: GetLatestComplianceReportUseCase,
    private readonly getReportById: GetComplianceReportByIdUseCase,
    private readonly searchLogs: SearchAuditLogsUseCase,
    private readonly getLogById: GetAuditLogByIdUseCase,
    private readonly createLog: CreateAuditLogUseCase,
  ) {}

  private toCheckResponse(check: ComplianceCheckAggregate): ComplianceCheckResponseDto {
    return {
      id: check.id,
      tenantId: check.tenantId,
      code: check.code,
      name: check.name,
      description: check.description,
      severity: check.severity,
      rules: check.rules as unknown as Record<string, unknown>,
      enabled: check.enabled,
      createdAt: check.createdAt.toISOString(),
      updatedAt: check.updatedAt.toISOString(),
    };
  }

  private toEvidenceDto(evidence: EvidenceItem): EvidenceItemDto {
    return {
      source: evidence.source,
      type: evidence.type,
      data: evidence.data,
      collectedAt: evidence.collectedAt.toISOString(),
    };
  }

  private toResultResponse(result: ComplianceCheckResultEntity): ComplianceResultResponseDto {
    return {
      id: result.id,
      checkId: result.checkId,
      checkCode: result.checkCode,
      status: result.status,
      evidence: result.evidence.map((e) => this.toEvidenceDto(e)),
      executedAt: result.executedAt.toISOString(),
    };
  }

  private toExecutionResponse(result: ComplianceExecutionResult): ComplianceExecutionResponseDto {
    return {
      summary: {
        totalChecks: result.totalChecks,
        passed: result.passed,
        failed: result.failed,
        warnings: result.warnings,
      },
      results: result.results.map((r) => this.toResultResponse(r)),
    };
  }

  private toReportResponse(report: ComplianceReportAggregate): ComplianceReportResponseDto {
    return {
      id: report.id,
      tenantId: report.tenantId,
      summary: report.summary,
      results: report.results.map((r) => this.toResultResponse(r)),
      generatedAt: report.generatedAt.toISOString(),
      createdAt: report.createdAt.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all compliance checks' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListChecksQueryDto,
  ): Promise<ComplianceCheckResponseDto[]> {
    const checks = await this.listChecks.execute({
      tenantId,
      enabled: query.enabled,
      severity: query.severity,
    });

    return checks.map((c) => this.toCheckResponse(c));
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run compliance checks' })
  async run(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() dto: RunComplianceChecksDto,
  ): Promise<ComplianceExecutionResponseDto> {
    const result = await this.runChecks.execute({
      tenantId,
      actorId,
      checkCodes: dto.checkCodes,
      targetDomain: dto.targetDomain,
      targetResourceType: dto.targetResourceType,
      targetResourceId: dto.targetResourceId,
      metadata: dto.metadata,
    });

    return this.toExecutionResponse(result);
  }

  @Post('report/generate')
  @ApiOperation({ summary: 'Generate a compliance report' })
  async generate(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() dto: GenerateReportDto,
  ): Promise<ComplianceReportResponseDto> {
    const report = await this.generateReport.execute({
      tenantId,
      actorId,
      runChecksFirst: dto.runChecksFirst,
    });

    return this.toReportResponse(report);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get the latest compliance report' })
  async getLatest(
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<ComplianceReportResponseDto> {
    const report = await this.getLatestReport.execute(tenantId);
    return this.toReportResponse(report);
  }

  @Get('report/:reportId')
  @ApiOperation({ summary: 'Get compliance report by ID' })
  async getById(@Param('reportId') reportId: string): Promise<ComplianceReportResponseDto> {
    const report = await this.getReportById.execute(reportId);
    return this.toReportResponse(report);
  }

  // ============================================
  // AUDIT LOGS ENDPOINTS
  // ============================================

  @Post('logs')
  @ApiOperation({ summary: 'Create audit log entry' })
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-org-id') orgId: string,
    @Body() dto: CreateAuditLogDto,
  ): Promise<CreateAuditLogResponseDto> {
    const result = await this.createLog.execute({
      tenantId,
      orgId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      actorId: dto.actorId,
      correlationId: dto.correlationId,
      metadata: dto.metadata,
      timestamp: dto.timestamp,
    });

    return { auditLogId: result.id };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Search audit logs' })
  async searchAuditLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: SearchAuditLogsDto,
  ): Promise<PagedAuditLogsResponseDto> {
    const result = await this.searchLogs.execute({
      tenantId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorId: query.actorId,
      action: query.action,
      from: query.from,
      to: query.to,
      q: query.q,
      page: query.page,
      size: query.size,
    });

    return {
      items: result.items.map((log: any) => this.toAuditLogResponse(log)),
      total: result.total,
      page: result.page,
      size: result.size,
    };
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async getAuditLogById(@Param('id') id: string): Promise<AuditLogResponseDto> {
    const log = await this.getLogById.execute(id);
    return this.toAuditLogResponse(log);
  }

  private toAuditLogResponse(log: any): AuditLogResponseDto {
    return {
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      actorId: log.actorId,
      tenantId: log.tenantId,
      orgId: log.orgId,
      correlationId: log.correlationId,
      metadata: log.metadata,
      timestamp: log.timestamp.toISOString(),
      createdAt: log.createdAt.toISOString(),
      actorName: log.actorName,
      actorEmail: log.actorEmail,
    };
  }
}
