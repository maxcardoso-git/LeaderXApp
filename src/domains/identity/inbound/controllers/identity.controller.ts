import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeactivateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  CreatePermissionUseCase,
  ListPermissionsUseCase,
  CreateRoleUseCase,
  ListRolesUseCase,
  GetRoleUseCase,
  UpdateRoleUseCase,
  UpsertRolePermissionsUseCase,
  AssignRoleUseCase,
  RevokeRoleUseCase,
  ListUserRolesUseCase,
  EvaluateAccessUseCase,
  ValidatePermissionUseCase,
} from '../../application/usecases';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  PermissionNotFoundError,
  PermissionCodeAlreadyExistsError,
  RoleNotFoundError,
  RoleCodeAlreadyExistsError,
  AssignmentNotFoundError,
  DuplicateAssignmentError,
  UserOrRoleNotFoundError,
  InvalidScopeError,
} from '../../application/errors';
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersQueryDto,
  CreatePermissionDto,
  ListPermissionsQueryDto,
  CreateRoleDto,
  ListRolesQueryDto,
  UpsertRolePermissionsDto,
  AssignRoleDto,
  RevokeRoleDto,
  ListUserRolesQueryDto,
  EvaluateAccessDto,
  ValidatePermissionDto,
} from '../dtos';
import { UserStatus, RoleEffect, ScopeType, AssignmentStatus } from '../../domain';

@ApiTags('Identity')
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly createPermissionUseCase: CreatePermissionUseCase,
    private readonly listPermissionsUseCase: ListPermissionsUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly upsertRolePermissionsUseCase: UpsertRolePermissionsUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly revokeRoleUseCase: RevokeRoleUseCase,
    private readonly listUserRolesUseCase: ListUserRolesUseCase,
    private readonly evaluateAccessUseCase: EvaluateAccessUseCase,
    private readonly validatePermissionUseCase: ValidatePermissionUseCase,
  ) {}

  // ========== USER ENDPOINTS ==========

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async createUser(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateUserDto,
  ) {
    try {
      return await this.createUserUseCase.execute({
        tenantId,
        externalId: dto.externalId,
        email: dto.email,
        fullName: dto.fullName,
        status: dto.status as UserStatus,
        idempotencyKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listUsers(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ListUsersQueryDto,
  ) {
    return await this.listUsersUseCase.execute({
      tenantId,
      status: dto.status as UserStatus,
      email: dto.email,
      page: dto.page ?? 1,
      size: dto.size ?? 25,
    });
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUser(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    try {
      return await this.getUserUseCase.execute({ tenantId, userId });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put('users/:userId')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateUser(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    try {
      return await this.updateUserUseCase.execute({
        tenantId,
        userId,
        email: dto.email,
        fullName: dto.fullName,
        status: dto.status as UserStatus,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Deactivate a user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async deactivateUser(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    try {
      return await this.deactivateUserUseCase.execute({ tenantId, userId });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ========== PERMISSION ENDPOINTS ==========

  @Post('permissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission code already exists' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async createPermission(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreatePermissionDto,
  ) {
    try {
      return await this.createPermissionUseCase.execute({
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        idempotencyKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listPermissions(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ListPermissionsQueryDto,
  ) {
    return await this.listPermissionsUseCase.execute({
      tenantId,
      category: dto.category,
      search: dto.search,
      page: dto.page ?? 1,
      size: dto.size ?? 50,
    });
  }

  // ========== ROLE ENDPOINTS ==========

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role code already exists' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async createRole(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateRoleDto,
  ) {
    try {
      return await this.createRoleUseCase.execute({
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        effect: dto.effect as RoleEffect,
        idempotencyKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listRoles(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ListRolesQueryDto,
  ) {
    return await this.listRolesUseCase.execute({
      tenantId,
      search: dto.search,
      page: dto.page ?? 1,
      size: dto.size ?? 25,
    });
  }

  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  async getRole(
    @Headers('x-tenant-id') tenantId: string,
    @Param('roleId') roleId: string,
    @Query('includePermissions') includePermissions?: string,
  ) {
    try {
      return await this.getRoleUseCase.execute({
        tenantId,
        roleId,
        includePermissions: includePermissions === 'true',
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put('roles/:roleId')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  async updateRole(
    @Headers('x-tenant-id') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() dto: { name?: string; description?: string },
  ) {
    try {
      return await this.updateRoleUseCase.execute({
        tenantId,
        roleId,
        name: dto.name,
        description: dto.description,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Upsert role permissions (replace set)' })
  @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  async upsertRolePermissions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpsertRolePermissionsDto,
  ) {
    try {
      return await this.upsertRolePermissionsUseCase.execute({
        tenantId,
        roleId,
        permissions: dto.permissions.map((p) => ({
          permissionCode: p.permissionCode,
          effect: p.effect as RoleEffect,
        })),
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ========== ASSIGNMENT ENDPOINTS ==========

  @Post('users/:userId/roles/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 409, description: 'Duplicate assignment' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async assignRole(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    try {
      return await this.assignRoleUseCase.execute({
        tenantId,
        userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType as ScopeType,
        scopeId: dto.scopeId,
        assignedBy: actorId,
        metadata: dto.metadata,
        idempotencyKey,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('users/:userId/roles/revoke')
  @ApiOperation({ summary: 'Revoke a role assignment' })
  @ApiResponse({ status: 200, description: 'Role revoked successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async revokeRole(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: RevokeRoleDto,
  ) {
    try {
      return await this.revokeRoleUseCase.execute({
        tenantId,
        userId,
        assignmentId: dto.assignmentId,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: 'List roles assigned to a user' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async listUserRoles(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
    @Query() dto: ListUserRolesQueryDto,
  ) {
    return await this.listUserRolesUseCase.execute({
      tenantId,
      userId,
      status: dto.status as AssignmentStatus,
    });
  }

  // ========== ACCESS EVALUATION ENDPOINTS ==========

  @Post('access/evaluate')
  @ApiOperation({ summary: 'Evaluate effective access for a user' })
  @ApiResponse({ status: 200, description: 'Access evaluated successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async evaluateAccess(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: EvaluateAccessDto,
  ) {
    return await this.evaluateAccessUseCase.execute({
      tenantId,
      userId: dto.userId,
      permissionCode: dto.permissionCode,
      context: dto.context,
    });
  }

  @Post('access/validate')
  @ApiOperation({ summary: 'Validate if a user has permission (quick check)' })
  @ApiResponse({ status: 200, description: 'Permission validated' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async validatePermission(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ValidatePermissionDto,
  ) {
    return await this.validatePermissionUseCase.execute({
      tenantId,
      userId: dto.userId,
      permissionCode: dto.permissionCode,
      context: dto.context,
    });
  }

  // ========== ERROR HANDLING ==========

  private handleError(error: unknown): never {
    // User errors
    if (error instanceof UserNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }
    if (error instanceof UserAlreadyExistsError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.CONFLICT,
      );
    }

    // Permission errors
    if (error instanceof PermissionNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }
    if (error instanceof PermissionCodeAlreadyExistsError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.CONFLICT,
      );
    }

    // Role errors
    if (error instanceof RoleNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }
    if (error instanceof RoleCodeAlreadyExistsError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.CONFLICT,
      );
    }

    // Assignment errors
    if (error instanceof AssignmentNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }
    if (error instanceof DuplicateAssignmentError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.CONFLICT,
      );
    }
    if (error instanceof UserOrRoleNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }

    // Scope errors
    if (error instanceof InvalidScopeError) {
      throw new HttpException(
        { error: error.code, message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }

    throw error;
  }
}
