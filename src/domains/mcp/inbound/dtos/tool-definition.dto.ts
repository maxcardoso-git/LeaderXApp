import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsObject, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateToolDefinitionDto {
  @ApiProperty({ example: 'SIMULATE_POINTS' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'Must start with uppercase letter, contain only A-Z, 0-9, _' })
  toolCode: string;

  @ApiProperty({ example: 'Simulate Points' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Simulates points calculation for a member' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'POINTS' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'INTERNAL' })
  @IsString()
  @IsOptional()
  visibility?: string;

  @ApiProperty({ example: 'POINTS_ENGINE' })
  @IsString()
  @IsNotEmpty()
  serviceCode: string;

  @ApiProperty({ example: 'POST' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ example: '/points/simulate' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsObject()
  inputSchema: Record<string, any>;

  @ApiProperty()
  @IsObject()
  outputSchema: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  noWrite?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  noApproval?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  noEventEmission?: boolean;

  @ApiPropertyOptional({ default: 5000 })
  @IsInt()
  @Min(1000)
  @Max(30000)
  @IsOptional()
  timeoutMs?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  auditEnabled?: boolean;

  @ApiPropertyOptional({ default: 'BASIC' })
  @IsString()
  @IsOptional()
  auditLevel?: string;
}

export class UpdateToolDefinitionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  visibility?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  method?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  noWrite?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  noApproval?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  noEventEmission?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  @IsOptional()
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  auditEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auditLevel?: string;
}
