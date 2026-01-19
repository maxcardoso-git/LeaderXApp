import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';

// ============================================
// WORKING UNITS CONTROLLER
// ============================================

@ApiTags('Governance - Working Units')
@Controller('governance/working-units')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class WorkingUnitsController {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(entity: any, includeMembers = false): any {
    const response: any = {
      id: entity.id,
      tenantId: entity.tenantId,
      structureId: entity.structureId,
      parentId: entity.parentId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      level: entity.level,
      path: entity.path,
      maxMembers: entity.maxMembers,
      status: entity.status,
      metadata: entity.metadata,
      settings: entity.settings,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };

    if (includeMembers && entity.memberships) {
      response.members = entity.memberships.map((m: any) => this.toMemberResponse(m));
    }

    if (entity.children) {
      response.children = entity.children.map((c: any) => this.toResponse(c, false));
    }

    return response;
  }

  private toMemberResponse(entity: any): any {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      workingUnitId: entity.workingUnitId,
      userId: entity.userId,
      positionId: entity.positionId,
      role: entity.role,
      isLeader: entity.isLeader,
      canApprove: entity.canApprove,
      joinedAt: entity.joinedAt.toISOString(),
      leftAt: entity.leftAt?.toISOString(),
      status: entity.status,
      metadata: entity.metadata,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private calculatePath(parentPath: string | null, code: string): string {
    return parentPath ? `${parentPath}/${code}` : `/${code}`;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new working unit' })
  @ApiResponse({ status: 201, description: 'Working unit created successfully' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: any,
  ) {
    // Check for duplicate code
    const existing = await this.prisma.workingUnit.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException(
        { error: 'WORKING_UNIT_CODE_EXISTS', message: `Working unit with code ${dto.code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Calculate level and path
    let level = 0;
    let path = `/${dto.code.toUpperCase()}`;

    if (dto.parentId) {
      const parent = await this.prisma.workingUnit.findFirst({
        where: { id: dto.parentId, tenantId },
      });

      if (!parent) {
        throw new HttpException(
          { error: 'PARENT_NOT_FOUND', message: `Parent working unit ${dto.parentId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      level = parent.level + 1;
      path = this.calculatePath(parent.path, dto.code.toUpperCase());
    }

    const workingUnit = await this.prisma.workingUnit.create({
      data: {
        tenantId,
        structureId: dto.structureId,
        parentId: dto.parentId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: dto.type || 'GROUP',
        level,
        path,
        maxMembers: dto.maxMembers,
        status: 'ACTIVE',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toResponse(workingUnit);
  }

  @Get()
  @ApiOperation({ summary: 'List working units' })
  @ApiResponse({ status: 200, description: 'Working units retrieved successfully' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('structureId') structureId?: string,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    const skip = (Number(page) - 1) * Number(size);
    const where: any = { tenantId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (structureId) where.structureId = structureId;
    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.workingUnit.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.workingUnit.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      page: Number(page),
      size: Number(size),
      total,
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get working units as a tree' })
  async getTree(
    @Headers('x-tenant-id') tenantId: string,
    @Query('type') type?: string,
    @Query('structureId') structureId?: string,
  ) {
    const where: any = { tenantId, parentId: null };
    if (type) where.type = type;
    if (structureId) where.structureId = structureId;

    const units = await this.prisma.workingUnit.findMany({
      where,
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: units.map((u) => this.toResponse(u)),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get working units statistics' })
  async getStats(@Headers('x-tenant-id') tenantId: string) {
    const [
      totalGroups,
      totalNuclei,
      activeGroups,
      activeNuclei,
      totalMembers,
    ] = await Promise.all([
      this.prisma.workingUnit.count({ where: { tenantId, type: 'GROUP' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'NUCLEUS' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'GROUP', status: 'ACTIVE' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'NUCLEUS', status: 'ACTIVE' } }),
      this.prisma.workingUnitMembership.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    return {
      totalGroups,
      totalNuclei,
      activeGroups,
      activeNuclei,
      totalMembers,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get working unit by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const workingUnit = await this.prisma.workingUnit.findFirst({
      where: { id, tenantId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          orderBy: [{ isLeader: 'desc' }, { role: 'asc' }],
        },
      },
    });

    if (!workingUnit) {
      throw new HttpException(
        { error: 'WORKING_UNIT_NOT_FOUND', message: `Working unit ${id} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(workingUnit, true);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update working unit' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const existing = await this.prisma.workingUnit.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'WORKING_UNIT_NOT_FOUND', message: `Working unit ${id} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    const workingUnit = await this.prisma.workingUnit.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        type: dto.type ?? existing.type,
        maxMembers: dto.maxMembers !== undefined ? dto.maxMembers : existing.maxMembers,
        status: dto.status ?? existing.status,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
        settings: (dto.settings ?? existing.settings ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toResponse(workingUnit);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/archive working unit' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const existing = await this.prisma.workingUnit.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'WORKING_UNIT_NOT_FOUND', message: `Working unit ${id} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check for children
    const childrenCount = await this.prisma.workingUnit.count({
      where: { parentId: id, tenantId },
    });

    if (childrenCount > 0) {
      throw new HttpException(
        { error: 'HAS_CHILDREN', message: 'Cannot delete working unit with children' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Soft delete
    const workingUnit = await this.prisma.workingUnit.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return this.toResponse(workingUnit);
  }

  // ============================================
  // MEMBERS ENDPOINTS
  // ============================================

  @Get(':id/members')
  @ApiOperation({ summary: 'Get members of a working unit' })
  async getMembers(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
  ) {
    const workingUnit = await this.prisma.workingUnit.findFirst({
      where: { id, tenantId },
    });

    if (!workingUnit) {
      throw new HttpException(
        { error: 'WORKING_UNIT_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const skip = (Number(page) - 1) * Number(size);

    const [items, total] = await Promise.all([
      this.prisma.workingUnitMembership.findMany({
        where: { workingUnitId: id, tenantId },
        skip,
        take: Number(size),
        orderBy: [{ isLeader: 'desc' }, { role: 'asc' }],
      }),
      this.prisma.workingUnitMembership.count({
        where: { workingUnitId: id, tenantId },
      }),
    ]);

    return {
      items: items.map((m) => this.toMemberResponse(m)),
      page: Number(page),
      size: Number(size),
      total,
    };
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to working unit' })
  async addMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const workingUnit = await this.prisma.workingUnit.findFirst({
      where: { id, tenantId },
    });

    if (!workingUnit) {
      throw new HttpException(
        { error: 'WORKING_UNIT_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if already member
    const existing = await this.prisma.workingUnitMembership.findUnique({
      where: {
        tenantId_workingUnitId_userId: {
          tenantId,
          workingUnitId: id,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new HttpException(
        { error: 'ALREADY_MEMBER', message: 'User is already a member' },
        HttpStatus.CONFLICT,
      );
    }

    // Check max members
    if (workingUnit.maxMembers) {
      const currentCount = await this.prisma.workingUnitMembership.count({
        where: { workingUnitId: id, status: 'ACTIVE' },
      });

      if (currentCount >= workingUnit.maxMembers) {
        throw new HttpException(
          { error: 'MAX_MEMBERS_REACHED', message: 'Maximum members limit reached' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const membership = await this.prisma.workingUnitMembership.create({
      data: {
        tenantId,
        workingUnitId: id,
        userId: dto.userId,
        positionId: dto.positionId,
        role: dto.role || 'MEMBER',
        isLeader: dto.isLeader ?? false,
        canApprove: dto.canApprove ?? false,
        status: 'ACTIVE',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toMemberResponse(membership);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member' })
  async updateMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: any,
  ) {
    const existing = await this.prisma.workingUnitMembership.findFirst({
      where: { id: memberId, workingUnitId: id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'MEMBER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const membership = await this.prisma.workingUnitMembership.update({
      where: { id: memberId },
      data: {
        positionId: dto.positionId ?? existing.positionId,
        role: dto.role ?? existing.role,
        isLeader: dto.isLeader ?? existing.isLeader,
        canApprove: dto.canApprove ?? existing.canApprove,
        status: dto.status ?? existing.status,
        leftAt: dto.status === 'REMOVED' ? new Date() : existing.leftAt,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toMemberResponse(membership);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from working unit' })
  async removeMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    const existing = await this.prisma.workingUnitMembership.findFirst({
      where: { id: memberId, workingUnitId: id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'MEMBER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.workingUnitMembership.update({
      where: { id: memberId },
      data: { status: 'REMOVED', leftAt: new Date() },
    });
  }
}
