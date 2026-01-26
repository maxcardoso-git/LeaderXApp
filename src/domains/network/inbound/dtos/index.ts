import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
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

// ============================================
// STRUCTURE TYPE DTOs
// ============================================

export class CreateStructureTypeDto {
  @ApiPropertyOptional({ description: 'Unique code for the structure type (auto-generated from name if not provided)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the structure type' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color code (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Scope of the structure type', enum: ['GLOBAL_ALL_COUNTRIES', 'COUNTRY_GROUP', 'CITY_GROUP', 'SINGLE_CITY'] })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Hierarchy level' })
  @IsOptional()
  @IsNumber()
  hierarchyLevel?: number;

  @ApiPropertyOptional({ description: 'Leadership role/position ID' })
  @IsOptional()
  @IsString()
  leadershipRoleId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of leaders', default: 1 })
  @IsOptional()
  @IsNumber()
  maxLeaders?: number;

  @ApiPropertyOptional({ description: 'Maximum hierarchy levels', default: 5 })
  @IsOptional()
  @IsNumber()
  maxLevels?: number;

  @ApiPropertyOptional({ description: 'Allow nested structures', default: true })
  @IsOptional()
  allowNested?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateStructureTypeDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color code (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Scope of the structure type', enum: ['GLOBAL_ALL_COUNTRIES', 'COUNTRY_GROUP', 'CITY_GROUP', 'SINGLE_CITY'] })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Hierarchy level' })
  @IsOptional()
  @IsNumber()
  hierarchyLevel?: number;

  @ApiPropertyOptional({ description: 'Leadership role/position ID' })
  @IsOptional()
  @IsString()
  leadershipRoleId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of leaders' })
  @IsOptional()
  @IsNumber()
  maxLeaders?: number;

  @ApiPropertyOptional({ description: 'Maximum hierarchy levels' })
  @IsOptional()
  @IsNumber()
  maxLevels?: number;

  @ApiPropertyOptional({ description: 'Allow nested structures' })
  @IsOptional()
  allowNested?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], description: 'Status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ListStructureTypesQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsNumber()
  size?: number;
}

export class StructureTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional()
  hierarchyLevel?: number;

  @ApiPropertyOptional()
  leadershipRoleId?: string;

  @ApiPropertyOptional()
  leadershipRole?: { id: string; name: string };

  @ApiProperty()
  maxLeaders: number;

  @ApiProperty()
  maxLevels: number;

  @ApiProperty()
  allowNested: boolean;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============================================
// STRUCTURE DTOs
// ============================================

export class CreateStructureDto {
  @ApiProperty({ description: 'Structure type ID' })
  @IsString()
  typeId: string;

  @ApiPropertyOptional({ description: 'Parent structure ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: 'Unique code for the structure' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Structure-specific settings' })
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateStructureDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent structure ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Structure-specific settings' })
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], description: 'Status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ListStructuresQueryDto {
  @ApiPropertyOptional({ description: 'Filter by type ID' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ description: 'Filter by parent ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsNumber()
  size?: number;
}

export class StructureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  typeId: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  level: number;

  @ApiPropertyOptional()
  path?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Relationships loaded optionally
  @ApiPropertyOptional()
  type?: StructureTypeResponseDto;

  @ApiPropertyOptional()
  parent?: StructureResponseDto;

  @ApiPropertyOptional()
  leaders?: any[];
}

// ============================================
// STRUCTURE LEADER DTOs
// ============================================

export class AssignLeaderDto {
  @ApiProperty({ description: 'User ID to assign as leader' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['OWNER', 'COORDINATOR', 'LEADER', 'DELEGATE'], description: 'Leadership role' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ description: 'Is primary leader', default: false })
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Can approve requests', default: true })
  @IsOptional()
  canApprove?: boolean;

  @ApiPropertyOptional({ description: 'Maximum approval amount' })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateLeaderDto {
  @ApiPropertyOptional({ enum: ['OWNER', 'COORDINATOR', 'LEADER', 'DELEGATE'], description: 'Leadership role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Is primary leader' })
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Can approve requests' })
  @IsOptional()
  canApprove?: boolean;

  @ApiPropertyOptional({ description: 'Maximum approval amount' })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'], description: 'Status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class StructureLeaderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  structureId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  canApprove: boolean;

  @ApiPropertyOptional()
  maxAmount?: number;

  @ApiProperty()
  startDate: string;

  @ApiPropertyOptional()
  endDate?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============================================
// STRUCTURE TREE DTOs
// ============================================

export class StructureTreeNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  typeId: string;

  @ApiPropertyOptional()
  typeName?: string;

  @ApiProperty()
  level: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: [StructureTreeNodeDto] })
  children?: StructureTreeNodeDto[];
}

// ============================================
// PAGINATED RESPONSE
// ============================================

export class PaginatedResponseDto<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  size: number;

  @ApiProperty()
  total: number;
}
