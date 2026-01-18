import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { NodeRole, NodeStatus, OwnerType, RelationType } from '../../domain/value-objects';

// ============================================
// REQUEST DTOs
// ============================================

export class CreateNetworkNodeDto {
  @ApiProperty({ description: 'Owner ID (tenant, community, event, etc.)' })
  @IsString()
  ownerId: string;

  @ApiProperty({ enum: OwnerType, description: 'Type of owner context' })
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  @ApiPropertyOptional({ description: 'User ID associated with this node' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: NodeRole, description: 'Role of the node', default: NodeRole.MEMBER })
  @IsOptional()
  @IsEnum(NodeRole)
  role?: NodeRole;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateNetworkNodeDto {
  @ApiPropertyOptional({ enum: NodeRole, description: 'New role for the node' })
  @IsOptional()
  @IsEnum(NodeRole)
  role?: NodeRole;

  @ApiPropertyOptional({ enum: NodeStatus, description: 'New status for the node' })
  @IsOptional()
  @IsEnum(NodeStatus)
  status?: NodeStatus;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class LinkNetworkNodeDto {
  @ApiProperty({ description: 'Parent node ID to link to' })
  @IsString()
  parentNodeId: string;

  @ApiPropertyOptional({ enum: RelationType, description: 'Type of relationship', default: RelationType.DIRECT })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType;
}

export class UnlinkNetworkNodeDto {
  @ApiProperty({ description: 'Parent node ID to unlink from' })
  @IsString()
  parentNodeId: string;
}

export class ListNetworkNodesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ enum: OwnerType, description: 'Filter by owner type' })
  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: NodeStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(NodeStatus)
  status?: NodeStatus;

  @ApiPropertyOptional({ enum: NodeRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(NodeRole)
  role?: NodeRole;
}

export class ValidateAuthorityDto {
  @ApiProperty({ description: 'Target node ID to validate authority against' })
  @IsString()
  targetNodeId: string;

  @ApiPropertyOptional({ description: 'Minimum number of approvers required', default: 1 })
  @IsOptional()
  @IsNumber()
  minApprovers?: number;

  @ApiPropertyOptional({ enum: NodeRole, isArray: true, description: 'Allowed roles for approval' })
  @IsOptional()
  @IsArray()
  @IsEnum(NodeRole, { each: true })
  allowedRoles?: NodeRole[];

  @ApiPropertyOptional({ description: 'Maximum depth to search', default: 10 })
  @IsOptional()
  @IsNumber()
  maxDepth?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class NetworkNodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ enum: OwnerType })
  ownerType: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty({ enum: NodeRole })
  role: string;

  @ApiProperty({ enum: NodeStatus })
  status: string;

  @ApiProperty()
  hierarchyLevel: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class NetworkRelationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  parentNodeId: string;

  @ApiProperty()
  childNodeId: string;

  @ApiProperty({ enum: RelationType })
  relationType: string;

  @ApiProperty()
  createdAt: string;
}

export class ApprovalChainNodeDto {
  @ApiProperty()
  nodeId: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty({ enum: NodeRole })
  role: string;

  @ApiProperty()
  hierarchyLevel: number;

  @ApiProperty()
  canApprove: boolean;
}

export class ApprovalChainResponseDto {
  @ApiProperty()
  targetNodeId: string;

  @ApiProperty({ type: [ApprovalChainNodeDto] })
  chain: ApprovalChainNodeDto[];

  @ApiProperty()
  calculatedAt: string;
}

export class ValidateAuthorityResponseDto {
  @ApiProperty()
  approverNodeId: string;

  @ApiProperty()
  targetNodeId: string;

  @ApiProperty()
  hasAuthority: boolean;

  @ApiProperty()
  validatedAt: string;
}
