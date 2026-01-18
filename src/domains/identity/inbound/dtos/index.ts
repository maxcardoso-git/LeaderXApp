import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  UserStatus,
  RoleEffect,
  ScopeType,
  AssignmentStatus,
} from '../../domain';

// User DTOs
export class CreateUserDto {
  @ApiPropertyOptional({ description: 'External ID (e.g., from IdP/SSO)' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: 'User email (unique per tenant)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

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

// Permission DTOs
export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission code (DOT_SEPARATED_UPPER format)' })
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({ description: 'Permission name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Permission category' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class ListPermissionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

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

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 50;
}

// Role DTOs
export class CreateRoleDto {
  @ApiProperty({ description: 'Role code (UPPER_SNAKE format)' })
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({ description: 'Role name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RoleEffect, default: RoleEffect.ALLOW })
  @IsOptional()
  @IsEnum(RoleEffect)
  effect?: RoleEffect;
}

export class ListRolesQueryDto {
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

// Role Permission DTOs
export class RolePermissionInputDto {
  @ApiProperty({ description: 'Permission code' })
  @IsString()
  permissionCode: string;

  @ApiPropertyOptional({ enum: RoleEffect, default: RoleEffect.ALLOW })
  @IsOptional()
  @IsEnum(RoleEffect)
  effect?: RoleEffect;
}

export class UpsertRolePermissionsDto {
  @ApiProperty({ type: [RolePermissionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionInputDto)
  permissions: RolePermissionInputDto[];
}

// Assignment DTOs
export class AssignRoleDto {
  @ApiProperty({ description: 'Role ID' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ enum: ScopeType })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiPropertyOptional({ description: 'Scope ID (required for non-GLOBAL/TENANT scopes)' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RevokeRoleDto {
  @ApiProperty({ description: 'Assignment ID' })
  @IsUUID()
  assignmentId: string;
}

export class ListUserRolesQueryDto {
  @ApiPropertyOptional({ enum: AssignmentStatus })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

// Access Evaluation DTOs
export class AccessContextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  networkNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class EvaluateAccessDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Permission code to check' })
  @IsString()
  permissionCode: string;

  @ApiPropertyOptional({ type: AccessContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessContextDto)
  context?: AccessContextDto;
}

export class ValidatePermissionDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Permission code to check' })
  @IsString()
  permissionCode: string;

  @ApiPropertyOptional({ type: AccessContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessContextDto)
  context?: AccessContextDto;
}

// Response DTOs
export class UserResponseDto {
  id: string;
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class PermissionResponseDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: string;
}

export class RoleResponseDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect: string;
  createdAt: string;
  updatedAt: string;
}

export class RolePermissionsResponseDto {
  roleId: string;
  permissions: Array<{
    permissionId: string;
    permissionCode: string;
    effect: string;
  }>;
}

export class AssignmentResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
  scopeType: string;
  scopeId?: string;
  status: string;
  assignedBy?: string;
  assignedAt: string;
  revokedAt?: string;
  metadata?: Record<string, unknown>;
}

export class EffectiveAccessResponseDto {
  decision: 'PERMIT' | 'DENY';
  matchedRules: string[];
  denyReasons: string[];
  allowReasons: string[];
}

export class AccessDecisionResponseDto {
  decision: 'PERMIT' | 'DENY';
  reason: string;
}

export class PaginatedResponseDto<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
