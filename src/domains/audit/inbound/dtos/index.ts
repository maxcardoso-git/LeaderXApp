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
