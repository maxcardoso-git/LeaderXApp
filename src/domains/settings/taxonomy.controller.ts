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
    // Generate code from name if not provided
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);

    const existing = await this.prisma.line.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'LINE_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Store allowedBlocks in metadata if provided
    const metadata = dto.metadata ?? {};
    if (dto.allowedBlocks) {
      metadata.allowedBlocks = dto.allowedBlocks;
    }

    return this.prisma.line.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        segmentId: dto.segmentId,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        metadata,
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

    const [rawItems, total] = await Promise.all([
      this.prisma.line.findMany({ where, skip, take: Number(size), orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.line.count({ where }),
    ]);

    // Transform items to include allowedBlocks at root level
    const items = rawItems.map((item) => ({
      ...item,
      allowedBlocks: (item.metadata as any)?.allowedBlocks || {},
    }));

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

    // Merge allowedBlocks into metadata
    let metadata = (existing.metadata as any) || {};
    if (dto.allowedBlocks) {
      metadata = { ...metadata, allowedBlocks: dto.allowedBlocks };
    } else if (dto.metadata) {
      metadata = dto.metadata;
    }

    const updated = await this.prisma.line.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        segmentId: dto.segmentId ?? existing.segmentId,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        status: dto.status ?? existing.status,
        metadata,
      },
    });

    // Return with frontend-friendly format
    return {
      ...updated,
      allowedBlocks: (updated.metadata as any)?.allowedBlocks || {},
    };
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
// CLASSIFICATIONS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Classifications')
@Controller('taxonomy/classifications')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class ClassificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new classification' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.classification.findUnique({
      where: { tenantId_categoryId_name: { tenantId, categoryId: dto.categoryId, name: dto.name } },
    });

    if (existing) {
      throw new HttpException({ error: 'CLASSIFICATION_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Verify category exists
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, tenantId },
    });

    if (!category) {
      throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.classification.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        badgeColor: dto.badgeColor ?? '#c4a45a',
        displayOrder: dto.displayOrder ?? 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List classifications' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      this.prisma.classification.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
      }),
      this.prisma.classification.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get classification by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const classification = await this.prisma.classification.findFirst({ where: { id, tenantId } });
    if (!classification) throw new HttpException({ error: 'CLASSIFICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return classification;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update classification' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.classification.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'CLASSIFICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.classification.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        categoryId: dto.categoryId ?? existing.categoryId,
        badgeColor: dto.badgeColor ?? existing.badgeColor,
        displayOrder: dto.displayOrder ?? existing.displayOrder,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete classification' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.classification.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'CLASSIFICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.classification.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// PROGRAMS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Programs')
@Controller('taxonomy/programs')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class ProgramsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new program' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);

    const existing = await this.prisma.program.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'PROGRAM_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Verify category exists if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.BAD_REQUEST);
      }
    }

    return this.prisma.program.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId || null,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List programs' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ name: 'asc' }]
      }),
      this.prisma.program.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const program = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return program;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update program' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Verify category exists if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.BAD_REQUEST);
      }
    }

    return this.prisma.program.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        categoryId: dto.categoryId !== undefined ? dto.categoryId || null : existing.categoryId,
        isActive: dto.isActive ?? existing.isActive,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete program' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.program.delete({ where: { id } });
    return existing;
  }
}

