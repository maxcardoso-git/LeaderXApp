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
import {
  CreateStructureDto,
  UpdateStructureDto,
  ListStructuresQueryDto,
  StructureResponseDto,
  StructureTreeNodeDto,
  AssignLeaderDto,
  UpdateLeaderDto,
  StructureLeaderResponseDto,
  PaginatedResponseDto,
} from '../dtos';

@ApiTags('Network - Structures')
@Controller('network/structures')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class StructuresController {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(entity: any, includeRelations = false): StructureResponseDto {
    const response: StructureResponseDto = {
      id: entity.id,
      tenantId: entity.tenantId,
      typeId: entity.typeId,
      parentId: entity.parentId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      level: entity.level,
      path: entity.path,
      metadata: entity.metadata as Record<string, unknown>,
      settings: entity.settings as Record<string, unknown>,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };

    if (includeRelations && entity.type) {
      response.type = {
        id: entity.type.id,
        tenantId: entity.type.tenantId,
        code: entity.type.code,
        name: entity.type.name,
        description: entity.type.description,
        icon: entity.type.icon,
        color: entity.type.color,
        scope: entity.type.scope,
        hierarchyLevel: entity.type.hierarchyLevel,
        leadershipRoleId: entity.type.leadershipRoleId,
        maxLeaders: entity.type.maxLeaders,
        maxLevels: entity.type.maxLevels,
        allowNested: entity.type.allowNested,
        metadata: entity.type.metadata as Record<string, unknown>,
        status: entity.type.status,
        createdAt: entity.type.createdAt.toISOString(),
        updatedAt: entity.type.updatedAt.toISOString(),
      };
    }

    if (includeRelations && entity.leaders) {
      response.leaders = entity.leaders.map((l: any) => this.toLeaderResponse(l));
    }

    return response;
  }

  private toLeaderResponse(entity: any): StructureLeaderResponseDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      structureId: entity.structureId,
      userId: entity.userId,
      role: entity.role,
      isPrimary: entity.isPrimary,
      canApprove: entity.canApprove,
      maxAmount: entity.maxAmount ? Number(entity.maxAmount) : undefined,
      startDate: entity.startDate.toISOString(),
      endDate: entity.endDate?.toISOString(),
      status: entity.status,
      metadata: entity.metadata as Record<string, unknown>,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private buildTreeNode(structure: any): StructureTreeNodeDto {
    return {
      id: structure.id,
      code: structure.code,
      name: structure.name,
      typeId: structure.typeId,
      typeName: structure.type?.name,
      level: structure.level,
      status: structure.status,
      children: structure.children?.map((c: any) => this.buildTreeNode(c)) || [],
    };
  }

  private calculatePath(parentPath: string | null, code: string): string {
    return parentPath ? `${parentPath}/${code}` : `/${code}`;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiResponse({ status: 201, description: 'Structure created successfully' })
  @ApiResponse({ status: 409, description: 'Structure code already exists' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateStructureDto,
  ): Promise<StructureResponseDto> {
    // Validate structure type exists
    const structureType = await this.prisma.structureType.findFirst({
      where: { id: dto.typeId, tenantId },
    });

    if (!structureType) {
      throw new HttpException(
        { error: 'STRUCTURE_TYPE_NOT_FOUND', message: `Structure type ${dto.typeId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check for duplicate code
    const existing = await this.prisma.structure.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException(
        { error: 'STRUCTURE_CODE_EXISTS', message: `Structure with code ${dto.code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Calculate level and path based on parent
    let level = 0;
    let path = `/${dto.code.toUpperCase()}`;

    if (dto.parentId) {
      const parent = await this.prisma.structure.findFirst({
        where: { id: dto.parentId, tenantId },
      });

      if (!parent) {
        throw new HttpException(
          { error: 'PARENT_STRUCTURE_NOT_FOUND', message: `Parent structure ${dto.parentId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      level = parent.level + 1;
      path = this.calculatePath(parent.path, dto.code.toUpperCase());

      // Check max levels
      if (level >= structureType.maxLevels) {
        throw new HttpException(
          { error: 'MAX_LEVELS_EXCEEDED', message: `Maximum hierarchy levels (${structureType.maxLevels}) exceeded` },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if nesting is allowed
      if (!structureType.allowNested && level > 0) {
        throw new HttpException(
          { error: 'NESTING_NOT_ALLOWED', message: `Structure type ${structureType.code} does not allow nesting` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const structure = await this.prisma.structure.create({
      data: {
        tenantId,
        typeId: dto.typeId,
        parentId: dto.parentId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        status: 'ACTIVE',
        level,
        path,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
      },
      include: { type: true },
    });

    return this.toResponse(structure, true);
  }

  @Get()
  @ApiOperation({ summary: 'List structures' })
  @ApiResponse({ status: 200, description: 'Structures retrieved successfully' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListStructuresQueryDto,
  ): Promise<PaginatedResponseDto<StructureResponseDto>> {
    const page = query.page ?? 1;
    const size = query.size ?? 25;
    const skip = (page - 1) * size;

    const where: any = { tenantId };

    if (query.typeId) {
      where.typeId = query.typeId;
    }

    if (query.parentId) {
      where.parentId = query.parentId;
    } else if (query.parentId === null || query.parentId === '') {
      where.parentId = null;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.structure.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        include: { type: true },
      }),
      this.prisma.structure.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item, true)),
      page,
      size,
      total,
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get structures as a tree' })
  @ApiResponse({ status: 200, description: 'Structure tree retrieved successfully' })
  async getTree(
    @Headers('x-tenant-id') tenantId: string,
    @Query('typeId') typeId?: string,
  ): Promise<{ items: StructureTreeNodeDto[] }> {
    const where: any = { tenantId, parentId: null };
    if (typeId) {
      where.typeId = typeId;
    }

    // Get root structures with recursive children
    const structures = await this.prisma.structure.findMany({
      where,
      include: {
        type: true,
        children: {
          include: {
            type: true,
            children: {
              include: {
                type: true,
                children: {
                  include: {
                    type: true,
                    children: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: structures.map((s) => this.buildTreeNode(s)),
    };
  }

  @Get(':structureId')
  @ApiOperation({ summary: 'Get structure by ID' })
  @ApiResponse({ status: 200, description: 'Structure retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
  ): Promise<StructureResponseDto> {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
      include: {
        type: true,
        leaders: {
          where: { status: 'ACTIVE' },
          orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
        },
      },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(structure, true);
  }

  @Put(':structureId')
  @ApiOperation({ summary: 'Update a structure' })
  @ApiResponse({ status: 200, description: 'Structure updated successfully' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
    @Body() dto: UpdateStructureDto,
  ): Promise<StructureResponseDto> {
    const existing = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Handle parent change
    let level = existing.level;
    let path = existing.path;

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId === null) {
        level = 0;
        path = `/${existing.code}`;
      } else {
        const parent = await this.prisma.structure.findFirst({
          where: { id: dto.parentId, tenantId },
        });

        if (!parent) {
          throw new HttpException(
            { error: 'PARENT_STRUCTURE_NOT_FOUND', message: `Parent structure ${dto.parentId} not found` },
            HttpStatus.NOT_FOUND,
          );
        }

        // Prevent circular reference
        if (parent.path?.startsWith(existing.path || '')) {
          throw new HttpException(
            { error: 'CIRCULAR_REFERENCE', message: 'Cannot set a descendant as parent' },
            HttpStatus.BAD_REQUEST,
          );
        }

        level = parent.level + 1;
        path = this.calculatePath(parent.path, existing.code);
      }
    }

    const structure = await this.prisma.structure.update({
      where: { id: structureId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
        level,
        path,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
        settings: (dto.settings ?? existing.settings ?? {}) as Prisma.InputJsonValue,
        status: dto.status ?? existing.status,
      },
      include: { type: true },
    });

    return this.toResponse(structure, true);
  }

  @Delete(':structureId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a structure' })
  @ApiResponse({ status: 200, description: 'Structure deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
  ): Promise<StructureResponseDto> {
    const existing = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
      include: { type: true },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check for children
    const childrenCount = await this.prisma.structure.count({
      where: { parentId: structureId, tenantId },
    });

    if (childrenCount > 0) {
      throw new HttpException(
        { error: 'HAS_CHILDREN', message: 'Cannot delete structure with children. Remove children first.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Soft delete - set to ARCHIVED
    const structure = await this.prisma.structure.update({
      where: { id: structureId },
      data: { status: 'ARCHIVED' },
      include: { type: true },
    });

    return this.toResponse(structure, true);
  }

  // ============================================
  // LEADERS ENDPOINTS
  // ============================================

  @Get(':structureId/leaders')
  @ApiOperation({ summary: 'Get leaders of a structure' })
  @ApiResponse({ status: 200, description: 'Leaders retrieved successfully' })
  async getLeaders(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
  ): Promise<{ items: StructureLeaderResponseDto[] }> {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    const leaders = await this.prisma.structureLeader.findMany({
      where: { structureId, tenantId },
      orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
    });

    return {
      items: leaders.map((l) => this.toLeaderResponse(l)),
    };
  }

  @Post(':structureId/leaders')
  @ApiOperation({ summary: 'Assign a leader to a structure' })
  @ApiResponse({ status: 201, description: 'Leader assigned successfully' })
  async assignLeader(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
    @Body() dto: AssignLeaderDto,
  ): Promise<StructureLeaderResponseDto> {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if user already has this role in this structure
    const existing = await this.prisma.structureLeader.findUnique({
      where: {
        tenantId_structureId_userId_role: {
          tenantId,
          structureId,
          userId: dto.userId,
          role: dto.role,
        },
      },
    });

    if (existing) {
      throw new HttpException(
        { error: 'DUPLICATE_LEADER', message: `User already has role ${dto.role} in this structure` },
        HttpStatus.CONFLICT,
      );
    }

    // If setting as primary, unset other primary leaders
    if (dto.isPrimary) {
      await this.prisma.structureLeader.updateMany({
        where: { structureId, tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const leader = await this.prisma.structureLeader.create({
      data: {
        tenantId,
        structureId,
        userId: dto.userId,
        role: dto.role,
        isPrimary: dto.isPrimary ?? false,
        canApprove: dto.canApprove ?? true,
        maxAmount: dto.maxAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: 'ACTIVE',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toLeaderResponse(leader);
  }

  @Put(':structureId/leaders/:leaderId')
  @ApiOperation({ summary: 'Update a leader assignment' })
  @ApiResponse({ status: 200, description: 'Leader updated successfully' })
  async updateLeader(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
    @Param('leaderId') leaderId: string,
    @Body() dto: UpdateLeaderDto,
  ): Promise<StructureLeaderResponseDto> {
    const existing = await this.prisma.structureLeader.findFirst({
      where: { id: leaderId, structureId, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'LEADER_NOT_FOUND', message: `Leader ${leaderId} not found in structure` },
        HttpStatus.NOT_FOUND,
      );
    }

    // If setting as primary, unset other primary leaders
    if (dto.isPrimary && !existing.isPrimary) {
      await this.prisma.structureLeader.updateMany({
        where: { structureId, tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const leader = await this.prisma.structureLeader.update({
      where: { id: leaderId },
      data: {
        role: dto.role ?? existing.role,
        isPrimary: dto.isPrimary ?? existing.isPrimary,
        canApprove: dto.canApprove ?? existing.canApprove,
        maxAmount: dto.maxAmount !== undefined ? dto.maxAmount : existing.maxAmount,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        status: dto.status ?? existing.status,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toLeaderResponse(leader);
  }

  @Delete(':structureId/leaders/:leaderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a leader from a structure' })
  @ApiResponse({ status: 204, description: 'Leader removed successfully' })
  async removeLeader(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
    @Param('leaderId') leaderId: string,
  ): Promise<void> {
    const existing = await this.prisma.structureLeader.findFirst({
      where: { id: leaderId, structureId, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'LEADER_NOT_FOUND', message: `Leader ${leaderId} not found in structure` },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.structureLeader.delete({
      where: { id: leaderId },
    });
  }

  // ============================================
  // APPROVAL CHAIN ENDPOINT
  // ============================================

  @Get(':structureId/approval-chain')
  @ApiOperation({ summary: 'Get approval chain for a structure' })
  @ApiResponse({ status: 200, description: 'Approval chain retrieved successfully' })
  async getApprovalChain(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
  ) {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
      include: {
        leaders: {
          where: { status: 'ACTIVE', canApprove: true },
          orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
        },
      },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Build approval chain by walking up the hierarchy
    const chain: any[] = [];
    let currentStructure: any = structure;

    while (currentStructure) {
      for (const leader of currentStructure.leaders || []) {
        chain.push({
          structureId: currentStructure.id,
          structureName: currentStructure.name,
          level: currentStructure.level,
          userId: leader.userId,
          role: leader.role,
          isPrimary: leader.isPrimary,
          canApprove: leader.canApprove,
          maxAmount: leader.maxAmount ? Number(leader.maxAmount) : null,
        });
      }

      if (currentStructure.parentId) {
        currentStructure = await this.prisma.structure.findFirst({
          where: { id: currentStructure.parentId, tenantId },
          include: {
            leaders: {
              where: { status: 'ACTIVE', canApprove: true },
              orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
            },
          },
        });
      } else {
        currentStructure = null;
      }
    }

    return {
      structureId,
      chain,
      calculatedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // RELATIONS ENDPOINT
  // ============================================

  @Get(':structureId/relations')
  @ApiOperation({ summary: 'Get related structures (parent, children, siblings)' })
  @ApiResponse({ status: 200, description: 'Relations retrieved successfully' })
  async getRelations(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
  ) {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
      include: {
        parent: true,
        children: {
          where: { status: 'ACTIVE' },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Get siblings (same parent, excluding self)
    const siblings = await this.prisma.structure.findMany({
      where: {
        tenantId,
        parentId: structure.parentId,
        id: { not: structureId },
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: [
        ...(structure.parent
          ? [{ type: 'PARENT', structure: this.toResponse(structure.parent, false) }]
          : []),
        ...structure.children.map((c: any) => ({
          type: 'CHILD',
          structure: this.toResponse(c, false),
        })),
        ...siblings.map((s) => ({
          type: 'SIBLING',
          structure: this.toResponse(s, false),
        })),
      ],
    };
  }

  // ============================================
  // VALIDATE AUTHORITY ENDPOINT
  // ============================================

  @Post(':structureId/validate-authority')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate if a user has authority over a structure' })
  @ApiResponse({ status: 200, description: 'Authority validated' })
  async validateAuthority(
    @Headers('x-tenant-id') tenantId: string,
    @Param('structureId') structureId: string,
    @Body() dto: { userId: string; action?: string; amount?: number },
  ) {
    const structure = await this.prisma.structure.findFirst({
      where: { id: structureId, tenantId },
    });

    if (!structure) {
      throw new HttpException(
        { error: 'STRUCTURE_NOT_FOUND', message: `Structure ${structureId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if user is a leader in this structure or any parent
    let currentStructure: any = structure;
    let hasAuthority = false;
    let authorityLevel: string | null = null;
    let maxAmount: number | null = null;

    while (currentStructure && !hasAuthority) {
      const leader = await this.prisma.structureLeader.findFirst({
        where: {
          structureId: currentStructure.id,
          userId: dto.userId,
          status: 'ACTIVE',
          canApprove: true,
        },
      });

      if (leader) {
        hasAuthority = true;
        authorityLevel = leader.role;
        maxAmount = leader.maxAmount ? Number(leader.maxAmount) : null;

        // Check amount limit if provided
        if (dto.amount && maxAmount && dto.amount > maxAmount) {
          hasAuthority = false;
        }
      }

      if (!hasAuthority && currentStructure.parentId) {
        currentStructure = await this.prisma.structure.findFirst({
          where: { id: currentStructure.parentId, tenantId },
        });
      } else {
        currentStructure = null;
      }
    }

    return {
      structureId,
      userId: dto.userId,
      hasAuthority,
      authorityLevel,
      maxAmount,
      validatedAt: new Date().toISOString(),
    };
  }
}
