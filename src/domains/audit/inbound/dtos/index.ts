import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';

// ============================================
// REQUEST DTOs
// ============================================

export class RunComplianceChecksDto {
  @ApiPropertyOptional({ description: 'Specific check codes to run (if empty, runs all enabled)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checkCodes?: string[];

  @ApiPropertyOptional({ description: 'Target domain for compliance check' })
  @IsOptional()
  @IsString()
  targetDomain?: string;

  @ApiPropertyOptional({ description: 'Target resource type' })
  @IsOptional()
  @IsString()
  targetResourceType?: string;

  @ApiPropertyOptional({ description: 'Target resource ID' })
  @IsOptional()
  @IsString()
  targetResourceId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for evaluation' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class GenerateReportDto {
  @ApiPropertyOptional({ description: 'Whether to run compliance checks before generating report' })
  @IsOptional()
  @IsBoolean()
  runChecksFirst?: boolean;
}

export class ListChecksQueryDto {
  @ApiPropertyOptional({ description: 'Filter by enabled status' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Filter by severity' })
  @IsOptional()
  @IsString()
  severity?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ComplianceCheckResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  rules: Record<string, unknown>;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class EvidenceItemDto {
  @ApiProperty()
  source: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  data: Record<string, unknown>;

  @ApiProperty()
  collectedAt: string;
}

export class ComplianceResultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  checkId: string;

  @ApiProperty()
  checkCode: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: [EvidenceItemDto] })
  evidence: EvidenceItemDto[];

  @ApiProperty()
  executedAt: string;
}

export class ComplianceSummaryDto {
  @ApiProperty()
  totalChecks: number;

  @ApiProperty()
  passed: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  warnings: number;
}

export class ComplianceExecutionResponseDto {
  @ApiProperty({ type: ComplianceSummaryDto })
  summary: ComplianceSummaryDto;

  @ApiProperty({ type: [ComplianceResultResponseDto] })
  results: ComplianceResultResponseDto[];
}

export class ComplianceReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ type: ComplianceSummaryDto })
  summary: ComplianceSummaryDto;

  @ApiProperty({ type: [ComplianceResultResponseDto] })
  results: ComplianceResultResponseDto[];

  @ApiProperty()
  generatedAt: string;

  @ApiProperty()
  createdAt: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  size: number;

  @ApiProperty()
  total: number;
}

// ============================================
// AUDIT LOG DTOs
// ============================================

export class SearchAuditLogsDto {
  @ApiPropertyOptional({ description: 'Filter by resource type' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Free text search' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 25 })
  @IsOptional()
  size?: number;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  resourceType: string;

  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  orgId: string;

  @ApiPropertyOptional()
  correlationId?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  actorName?: string;

  @ApiPropertyOptional()
  actorEmail?: string;
}

export class PagedAuditLogsResponseDto extends PaginatedResponseDto<AuditLogResponseDto> {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];
}

export class CreateAuditLogDto {
  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Resource type' })
  @IsString()
  resourceType: string;

  @ApiProperty({ description: 'Resource ID' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Actor ID' })
  @IsString()
  actorId: string;

  @ApiPropertyOptional({ description: 'Correlation ID' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Timestamp (ISO 8601)' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateAuditLogResponseDto {
  @ApiProperty()
  auditLogId: string;
}
