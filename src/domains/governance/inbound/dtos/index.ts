import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsObject,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PolicyStatus,
  PolicyScope,
  GovernanceDecision,
  RuleEffect,
  ConditionOperator,
} from '../../domain';

// ================== Request DTOs ==================

// Policy Condition DTO
export class PolicyConditionDto {
  @ApiProperty({ description: 'Field to evaluate' })
  @IsString()
  field: string;

  @ApiProperty({ enum: ConditionOperator })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ description: 'Value to compare' })
  value: unknown;
}

// Policy Rules DTO
export class PolicyRulesDto {
  @ApiProperty({ type: [PolicyConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyConditionDto)
  conditions: PolicyConditionDto[];

  @ApiProperty({ enum: RuleEffect })
  @IsEnum(RuleEffect)
  effect: RuleEffect;
}

// Create Policy DTO
export class CreatePolicyDto {
  @ApiProperty({ description: 'Unique policy code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Policy name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PolicyScope, default: PolicyScope.GLOBAL })
  @IsOptional()
  @IsEnum(PolicyScope)
  scope?: PolicyScope;

  @ApiProperty({ type: PolicyRulesDto })
  @ValidateNested()
  @Type(() => PolicyRulesDto)
  rules: PolicyRulesDto;
}

// Update Policy DTO
export class UpdatePolicyDto {
  @ApiPropertyOptional({ description: 'Policy name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: PolicyRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyRulesDto)
  rules?: PolicyRulesDto;
}

// Evaluation Context DTO
export class EvaluationContextDto {
  @ApiProperty({ description: 'Actor ID performing the action' })
  @IsString()
  actorId: string;

  @ApiPropertyOptional({ description: 'Actor roles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actorRoles?: string[];

  @ApiPropertyOptional({ description: 'Resource type' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: 'Action being performed' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Network node ID' })
  @IsOptional()
  @IsString()
  networkNodeId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Evaluate Request DTO
export class EvaluateGovernanceDto {
  @ApiPropertyOptional({ description: 'Specific policy code to evaluate' })
  @IsOptional()
  @IsString()
  policyCode?: string;

  @ApiProperty({ type: EvaluationContextDto })
  @ValidateNested()
  @Type(() => EvaluationContextDto)
  context: EvaluationContextDto;
}

// ================== Query DTOs ==================

export class ListPoliciesQueryDto {
  @ApiPropertyOptional({ enum: PolicyStatus })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @ApiPropertyOptional({ enum: PolicyScope })
  @IsOptional()
  @IsEnum(PolicyScope)
  scope?: PolicyScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 25;
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policyCode?: string;

  @ApiPropertyOptional({ enum: GovernanceDecision })
  @IsOptional()
  @IsEnum(GovernanceDecision)
  decision?: GovernanceDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 25;
}

// ================== Response DTOs ==================

export class PolicyResponseDto {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  scope: string;
  rules: PolicyRulesDto;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class EvaluationResultDto {
  decision: string;
  policyCode: string;
  policyId?: string;
  reason?: string;
  evaluatedAt: string;
}

export class EnforcementResultDto {
  finalDecision: string;
  evaluations: EvaluationResultDto[];
  denyReasons: string[];
}

export class AuditLogResponseDto {
  id: string;
  tenantId: string;
  policyCode: string;
  policyId?: string;
  decision: string;
  context: Record<string, unknown>;
  reason?: string;
  evaluatedAt: string;
}

export class PaginatedResponseDto<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
