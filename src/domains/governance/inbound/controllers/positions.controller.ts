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
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';

// ============================================
// POSITIONS (CARGOS) CONTROLLER
// ============================================

@ApiTags('Governance - Positions')
@Controller('governance/roles')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class PositionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new position' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.position.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException({ error: 'POSITION_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.position.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        hierarchyGroup: dto.hierarchyGroup || 'OPERACIONAL',
        level: dto.level ?? 0,
        canApprove: dto.canApprove ?? false,
        approvalLimit: dto.approvalLimit,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List positions' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('hierarchyGroup') hierarchyGroup?: string,
  ) {
    const skip = (Number(page) - 1) * Number(size);
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (hierarchyGroup) where.hierarchyGroup = hierarchyGroup;

    const [items, total] = await Promise.all([
      this.prisma.position.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.position.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const position = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!position) throw new HttpException({ error: 'POSITION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return position;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update position' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'POSITION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.position.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        hierarchyGroup: dto.hierarchyGroup ?? existing.hierarchyGroup,
        level: dto.level ?? existing.level,
        canApprove: dto.canApprove ?? existing.canApprove,
        approvalLimit: dto.approvalLimit !== undefined ? dto.approvalLimit : existing.approvalLimit,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete position' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'POSITION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.position.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// HIERARCHY GROUPS CONTROLLER
// ============================================

@ApiTags('Governance - Hierarchy Groups')
@Controller('governance/role-groups')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class HierarchyGroupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hierarchy group' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.hierarchyGroup.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException({ error: 'HIERARCHY_GROUP_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.hierarchyGroup.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        level: dto.level ?? 0,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List hierarchy groups' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
  ) {
    const skip = (Number(page) - 1) * Number(size);
    const where: any = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.hierarchyGroup.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.hierarchyGroup.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hierarchy group by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const group = await this.prisma.hierarchyGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new HttpException({ error: 'HIERARCHY_GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return group;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update hierarchy group' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.hierarchyGroup.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'HIERARCHY_GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.hierarchyGroup.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        level: dto.level ?? existing.level,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete hierarchy group' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.hierarchyGroup.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'HIERARCHY_GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.hierarchyGroup.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// SCOPES (ESCOPOS DE ESTRUTURA) CONTROLLER
// ============================================

@ApiTags('Governance - Scopes')
@Controller('governance/scopes')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class ScopesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new scope' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);

    const existing = await this.prisma.scope.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'SCOPE_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.scope.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        level: dto.level ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List scopes' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
  ) {
    const skip = (Number(page) - 1) * Number(size);
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.scope.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.scope.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scope by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const scope = await this.prisma.scope.findFirst({ where: { id, tenantId } });
    if (!scope) throw new HttpException({ error: 'SCOPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return scope;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update scope' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.scope.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'SCOPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.scope.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        level: dto.level ?? existing.level,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete scope' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.scope.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'SCOPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.scope.delete({ where: { id } });
    return existing;
  }
}
