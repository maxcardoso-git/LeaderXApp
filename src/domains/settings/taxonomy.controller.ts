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

// ============================================
// DTOs
// ============================================

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// CATEGORIES CONTROLLER
// ============================================

@ApiTags('Taxonomy - Categories')
@Controller('taxonomy/categories')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: any,
  ) {
    const existing = await this.prisma.category.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException(
        { error: 'CATEGORY_CODE_EXISTS', message: `Category with code ${dto.code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    let level = 0;
    let path = `/${dto.code.toUpperCase()}`;

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}/${dto.code.toUpperCase()}`;
      }
    }

    return this.prisma.category.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        level,
        path,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({ where, skip, take: Number(size), orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.category.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: { children: true },
    });

    if (!category) {
      throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return category;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const existing = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const existing = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const childrenCount = await this.prisma.category.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      return this.prisma.category.update({ where: { id }, data: { status: 'INACTIVE' } });
    }

    await this.prisma.category.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// SEGMENTS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Segments')
@Controller('taxonomy/segments')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class SegmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new segment' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.segment.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException({ error: 'SEGMENT_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.segment.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List segments' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.segment.findMany({ where, skip, take: Number(size), orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.segment.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get segment by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const segment = await this.prisma.segment.findFirst({ where: { id, tenantId } });
    if (!segment) throw new HttpException({ error: 'SEGMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return segment;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update segment' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.segment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'SEGMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.segment.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete segment' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.segment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'SEGMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.segment.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// LINES CONTROLLER
// ============================================

@ApiTags('Taxonomy - Lines')
@Controller('taxonomy/lines')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class LinesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new line' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.line.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException({ error: 'LINE_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.line.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        segmentId: dto.segmentId,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List lines' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('segmentId') segmentId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (segmentId) where.segmentId = segmentId;

    const [items, total] = await Promise.all([
      this.prisma.line.findMany({ where, skip, take: Number(size), orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.line.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get line by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const line = await this.prisma.line.findFirst({ where: { id, tenantId } });
    if (!line) throw new HttpException({ error: 'LINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return line;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update line' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.line.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'LINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.line.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        segmentId: dto.segmentId ?? existing.segmentId,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete line' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.line.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'LINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.line.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// POSITIONS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Positions')
@Controller('taxonomy/positions')
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
        hierarchyGroup: dto.hierarchyGroup,
        level: dto.level ?? 0,
        canApprove: dto.canApprove ?? false,
        approvalLimit: dto.approvalLimit,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List positions' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
    @Query('search') search?: string,
    @Query('hierarchyGroup') hierarchyGroup?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId, status: 'ACTIVE' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (hierarchyGroup) where.hierarchyGroup = hierarchyGroup;

    const [items, total] = await Promise.all([
      this.prisma.position.findMany({ where, skip, take: Number(size), orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
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
        approvalLimit: dto.approvalLimit ?? existing.approvalLimit,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete position' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'POSITION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.position.update({ where: { id }, data: { status: 'INACTIVE' } });
    return existing;
  }
}

// ============================================
// HIERARCHY GROUPS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Hierarchy Groups')
@Controller('taxonomy/hierarchy-groups')
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
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId, status: 'ACTIVE' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.hierarchyGroup.findMany({ where, skip, take: Number(size), orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
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

    await this.prisma.hierarchyGroup.update({ where: { id }, data: { status: 'INACTIVE' } });
    return existing;
  }
}
