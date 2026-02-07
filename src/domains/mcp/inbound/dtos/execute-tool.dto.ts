import { IsString, IsNotEmpty, IsOptional, Allow } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteToolDto {
  @ApiProperty({ description: 'Tool code from registry', example: 'SIMULATE_POINTS' })
  @IsString()
  @IsNotEmpty()
  toolCode: string;

  @ApiProperty({ description: 'Tool input payload' })
  @Allow()
  input: Record<string, any>;

  @ApiPropertyOptional({ description: 'Agent execution context' })
  @Allow()
  @IsOptional()
  agentContext?: {
    agentId: string;
    tenantId?: string;
    orgId?: string;
    role?: string;
  };
}
