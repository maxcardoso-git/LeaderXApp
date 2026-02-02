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
        previousCategoryId: dto.previousCategoryId,
        level,
        path,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? dto.displayOrder ?? 0,
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
        previousCategoryId: dto.previousCategoryId !== undefined ? dto.previousCategoryId || null : existing.previousCategoryId,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        sortOrder: dto.sortOrder ?? dto.displayOrder ?? existing.sortOrder,
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
        // Strategic Event Classification
        purposeId: dto.purposeId,
        targetAudiences: dto.targetAudiences ?? [],
        seniorityLevel: dto.seniorityLevel,
        interactionFormats: dto.interactionFormats ?? [],
        relationshipDepth: dto.relationshipDepth,
        strategicTags: dto.strategicTags ?? [],
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
    @Query('purposeId') purposeId?: string,
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
    if (purposeId) where.purposeId = purposeId;

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
        // Strategic Event Classification
        purposeId: dto.purposeId !== undefined ? dto.purposeId : existing.purposeId,
        targetAudiences: dto.targetAudiences !== undefined ? dto.targetAudiences : existing.targetAudiences,
        seniorityLevel: dto.seniorityLevel !== undefined ? dto.seniorityLevel : existing.seniorityLevel,
        interactionFormats: dto.interactionFormats !== undefined ? dto.interactionFormats : existing.interactionFormats,
        relationshipDepth: dto.relationshipDepth !== undefined ? dto.relationshipDepth : existing.relationshipDepth,
        strategicTags: dto.strategicTags !== undefined ? dto.strategicTags : existing.strategicTags,
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

    // Verify categories exist if provided
    const categoryIds = dto.categoryIds || [];
    if (categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds }, tenantId },
      });
      if (categories.length !== categoryIds.length) {
        throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.BAD_REQUEST);
      }
    }

    const program = await this.prisma.program.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        renewalPeriodMonths: dto.renewalPeriodMonths || null,
        billingPeriod: dto.billingPeriod || null,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? {},
        categories: {
          create: categoryIds.map((categoryId: string) => ({
            tenantId,
            categoryId,
          })),
        },
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return program;
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

    if (categoryId) {
      where.categories = {
        some: { categoryId },
      };
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const now = new Date();
    const [rawItems, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ name: 'asc' }],
        include: {
          pricing: true,
          priceTables: {
            where: { isActive: true },
            orderBy: { startsAt: 'desc' },
          },
          benefits: {
            include: { benefit: true },
            orderBy: { sortOrder: 'asc' },
          },
          categories: {
            include: { category: true },
          },
        },
      }),
      this.prisma.program.count({ where }),
    ]);

    // Add currentPriceTable (active and within date range)
    const items = rawItems.map((program) => {
      const currentPriceTable = program.priceTables.find((pt: { startsAt: Date; endsAt: Date | null; isActive: boolean }) => {
        const startsValid = new Date(pt.startsAt) <= now;
        const endsValid = !pt.endsAt || new Date(pt.endsAt) >= now;
        return pt.isActive && startsValid && endsValid;
      });
      return { ...program, currentPriceTable };
    });

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

    // Verify categories exist if provided
    if (dto.categoryIds !== undefined) {
      const categoryIds = dto.categoryIds || [];
      if (categoryIds.length > 0) {
        const categories = await this.prisma.category.findMany({
          where: { id: { in: categoryIds }, tenantId },
        });
        if (categories.length !== categoryIds.length) {
          throw new HttpException({ error: 'CATEGORY_NOT_FOUND' }, HttpStatus.BAD_REQUEST);
        }
      }

      // Update categories - delete all and recreate
      await this.prisma.programCategory.deleteMany({ where: { programId: id } });
      if (categoryIds.length > 0) {
        await this.prisma.programCategory.createMany({
          data: categoryIds.map((categoryId: string) => ({
            tenantId,
            programId: id,
            categoryId,
          })),
        });
      }
    }

    return this.prisma.program.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        renewalPeriodMonths: dto.renewalPeriodMonths !== undefined ? dto.renewalPeriodMonths : existing.renewalPeriodMonths,
        billingPeriod: dto.billingPeriod !== undefined ? dto.billingPeriod : existing.billingPeriod,
        isActive: dto.isActive ?? existing.isActive,
        metadata: dto.metadata ?? existing.metadata,
      },
      include: {
        categories: {
          include: { category: true },
        },
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

  @Get(':id/full')
  @ApiOperation({ summary: 'Get program with pricing, price tables, and benefits' })
  async getFullById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const now = new Date();
    const program = await this.prisma.program.findFirst({
      where: { id, tenantId },
      include: {
        pricing: true,
        priceTables: {
          orderBy: { startsAt: 'desc' },
        },
        benefits: {
          include: { benefit: true },
          orderBy: { sortOrder: 'asc' },
        },
        categories: {
          include: { category: true },
        },
      },
    });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Find current active price table
    const currentPriceTable = program.priceTables.find((pt: { startsAt: Date; endsAt: Date | null; isActive: boolean }) => {
      const startsValid = new Date(pt.startsAt) <= now;
      const endsValid = !pt.endsAt || new Date(pt.endsAt) >= now;
      return pt.isActive && startsValid && endsValid;
    });

    // Check if any category has classifications (for benefits eligibility)
    let canHaveBenefits = false;
    if (program.categories && program.categories.length > 0) {
      const categoryIds = program.categories.map(pc => pc.categoryId);
      const classificationsCount = await this.prisma.classification.count({
        where: { tenantId, categoryId: { in: categoryIds } },
      });
      canHaveBenefits = classificationsCount > 0;
    }

    return { ...program, currentPriceTable, canHaveBenefits };
  }

  @Put(':id/pricing')
  @ApiOperation({ summary: 'Update or create program pricing' })
  async updatePricing(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const program = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const existingPricing = await this.prisma.planPricing.findUnique({ where: { programId: id } });

    if (existingPricing) {
      return this.prisma.planPricing.update({
        where: { programId: id },
        data: {
          monthlyValue: dto.monthlyValue ?? existingPricing.monthlyValue,
          currency: dto.currency ?? existingPricing.currency,
          validity: dto.validity ?? existingPricing.validity,
          pointsPerMonth: dto.pointsPerMonth ?? existingPricing.pointsPerMonth,
          metadata: dto.metadata ?? existingPricing.metadata,
        },
      });
    }

    return this.prisma.planPricing.create({
      data: {
        tenantId,
        programId: id,
        monthlyValue: dto.monthlyValue || 0,
        currency: dto.currency || 'BRL',
        validity: dto.validity,
        pointsPerMonth: dto.pointsPerMonth || 0,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Put(':id/benefits')
  @ApiOperation({ summary: 'Set program benefits' })
  async setBenefits(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: { benefitIds: string[] }) {
    const program = await this.prisma.program.findFirst({
      where: { id, tenantId },
      include: { categories: true },
    });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check if any of program's categories has classifications
    if (program.categories && program.categories.length > 0) {
      const categoryIds = program.categories.map(pc => pc.categoryId);
      const classificationsCount = await this.prisma.classification.count({
        where: { tenantId, categoryId: { in: categoryIds } },
      });
      if (classificationsCount === 0 && dto.benefitIds.length > 0) {
        throw new HttpException(
          { error: 'CATEGORY_NO_CLASSIFICATION', message: 'Programs with categories without classification cannot have benefits' },
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (dto.benefitIds.length > 0) {
      throw new HttpException(
        { error: 'PROGRAM_NO_CATEGORY', message: 'Programs without category cannot have benefits' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Delete existing benefits
    await this.prisma.planBenefit.deleteMany({ where: { programId: id } });

    // Create new benefits
    if (dto.benefitIds.length > 0) {
      await this.prisma.planBenefit.createMany({
        data: dto.benefitIds.map((benefitId, index) => ({
          tenantId,
          programId: id,
          benefitId,
          sortOrder: index,
        })),
      });
    }

    return this.prisma.planBenefit.findMany({
      where: { programId: id },
      include: { benefit: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ============================================
  // PRICE TABLES ENDPOINTS
  // ============================================

  @Get(':id/price-tables')
  @ApiOperation({ summary: 'List price tables for a program' })
  async listPriceTables(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const program = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const now = new Date();
    const priceTables = await this.prisma.programPriceTable.findMany({
      where: { programId: id },
      orderBy: { startsAt: 'desc' },
    });

    // Mark which one is current
    return priceTables.map((pt) => {
      const startsValid = new Date(pt.startsAt) <= now;
      const endsValid = !pt.endsAt || new Date(pt.endsAt) >= now;
      const isCurrent = pt.isActive && startsValid && endsValid;
      return { ...pt, isCurrent };
    });
  }

  @Post(':id/price-tables')
  @ApiOperation({ summary: 'Create a new price table for a program' })
  async createPriceTable(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const program = await this.prisma.program.findFirst({ where: { id, tenantId } });
    if (!program) throw new HttpException({ error: 'PROGRAM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.programPriceTable.create({
      data: {
        tenantId,
        programId: id,
        name: dto.name || null,
        monthlyValue: dto.monthlyValue || 0,
        currency: dto.currency || 'BRL',
        pointsPerMonth: dto.pointsPerMonth || 0,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Put(':id/price-tables/:priceTableId')
  @ApiOperation({ summary: 'Update a price table' })
  async updatePriceTable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('priceTableId') priceTableId: string,
    @Body() dto: any,
  ) {
    const priceTable = await this.prisma.programPriceTable.findFirst({
      where: { id: priceTableId, programId: id, tenantId },
    });
    if (!priceTable) throw new HttpException({ error: 'PRICE_TABLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.programPriceTable.update({
      where: { id: priceTableId },
      data: {
        name: dto.name !== undefined ? dto.name : priceTable.name,
        monthlyValue: dto.monthlyValue ?? priceTable.monthlyValue,
        currency: dto.currency ?? priceTable.currency,
        pointsPerMonth: dto.pointsPerMonth ?? priceTable.pointsPerMonth,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : priceTable.startsAt,
        endsAt: dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : priceTable.endsAt,
        isActive: dto.isActive ?? priceTable.isActive,
        metadata: dto.metadata ?? priceTable.metadata,
      },
    });
  }

  @Delete(':id/price-tables/:priceTableId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a price table' })
  async deletePriceTable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('priceTableId') priceTableId: string,
  ) {
    const priceTable = await this.prisma.programPriceTable.findFirst({
      where: { id: priceTableId, programId: id, tenantId },
    });
    if (!priceTable) throw new HttpException({ error: 'PRICE_TABLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.programPriceTable.delete({ where: { id: priceTableId } });
    return priceTable;
  }
}

// ============================================
// SUBSCRIBER BENEFITS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Subscriber Benefits')
@Controller('taxonomy/benefits')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class SubscriberBenefitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscriber benefit' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);

    const existing = await this.prisma.subscriberBenefit.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'BENEFIT_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.subscriberBenefit.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        type: dto.type || 'OTHER',
        icon: dto.icon,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List subscriber benefits' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      this.prisma.subscriberBenefit.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.subscriberBenefit.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get('types')
  @ApiOperation({ summary: 'List benefit types' })
  async listTypes(@Headers('x-tenant-id') tenantId: string) {
    const types = await this.prisma.subscriberBenefit.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: true,
    });

    return types.map((t) => ({ type: t.type, count: t._count }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get benefit by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const benefit = await this.prisma.subscriberBenefit.findFirst({ where: { id, tenantId } });
    if (!benefit) throw new HttpException({ error: 'BENEFIT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return benefit;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update benefit' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.subscriberBenefit.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'BENEFIT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.subscriberBenefit.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        type: dto.type ?? existing.type,
        icon: dto.icon ?? existing.icon,
        isActive: dto.isActive ?? existing.isActive,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete benefit' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.subscriberBenefit.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'BENEFIT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check if benefit is used by any plan
    const usageCount = await this.prisma.planBenefit.count({ where: { benefitId: id } });
    if (usageCount > 0) {
      throw new HttpException(
        { error: 'BENEFIT_IN_USE', message: `This benefit is used by ${usageCount} plan(s)` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.subscriberBenefit.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// EVENT TYPES CONTROLLER
// ============================================

@ApiTags('Taxonomy - Event Types')
@Controller('taxonomy/event-types')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class EventTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event type' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.eventType.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new HttpException({ error: 'EVENT_TYPE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.eventType.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List event types' })
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
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.eventType.findMany({ where, skip, take: Number(size), orderBy: { name: 'asc' } }),
      this.prisma.eventType.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event type by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const eventType = await this.prisma.eventType.findFirst({ where: { id, tenantId } });
    if (!eventType) throw new HttpException({ error: 'EVENT_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return eventType;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event type' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.eventType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'EVENT_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check for name conflict
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.eventType.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (nameConflict) {
        throw new HttpException({ error: 'EVENT_TYPE_NAME_EXISTS' }, HttpStatus.CONFLICT);
      }
    }

    return this.prisma.eventType.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete event type' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.eventType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'EVENT_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check if event type is used by venues
    const usageCount = await this.prisma.eventVenueEventType.count({ where: { eventTypeId: id } });
    if (usageCount > 0) {
      throw new HttpException(
        { error: 'EVENT_TYPE_IN_USE', message: `This event type is used by ${usageCount} venue(s)` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.eventType.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// EVENT VENUES CONTROLLER
// ============================================

@ApiTags('Taxonomy - Event Venues')
@Controller('taxonomy/event-venues')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class EventVenuesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event venue' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.eventVenue.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new HttpException({ error: 'EVENT_VENUE_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Create venue
    const venue = await this.prisma.eventVenue.create({
      data: {
        tenantId,
        name: dto.name,
        venueType: dto.venueType || 'OTHER',
        address: dto.address || {},
        parking: dto.parking || { type: 'NONE' },
        areas: dto.areas || [],
        techInfrastructure: dto.techInfrastructure || {},
        serviceInfrastructure: dto.serviceInfrastructure || {},
        technicalTeam: dto.technicalTeam || {},
        availableMonths: dto.availableMonths || [],
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        metadata: dto.metadata || {},
      },
    });

    // Create event type associations
    if (dto.allowedEventTypeIds?.length > 0) {
      await this.prisma.eventVenueEventType.createMany({
        data: dto.allowedEventTypeIds.map((eventTypeId: string) => ({
          tenantId,
          venueId: venue.id,
          eventTypeId,
        })),
      });
    }

    // Return venue with event types
    return this.getVenueWithEventTypes(venue.id, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List event venues' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('venueType') venueType?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (venueType) where.venueType = venueType;

    const [rawItems, total] = await Promise.all([
      this.prisma.eventVenue.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: { name: 'asc' },
        include: {
          venueEventTypes: {
            include: { eventType: true },
          },
        },
      }),
      this.prisma.eventVenue.count({ where }),
    ]);

    // Transform to include allowedEventTypeIds and allowedEventTypes
    const items = rawItems.map((venue) => ({
      ...venue,
      allowedEventTypeIds: venue.venueEventTypes.map((vet) => vet.eventTypeId),
      allowedEventTypes: venue.venueEventTypes.map((vet) => vet.eventType),
      venueEventTypes: undefined,
    }));

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event venue by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const venue = await this.getVenueWithEventTypes(id, tenantId);
    if (!venue) throw new HttpException({ error: 'EVENT_VENUE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return venue;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event venue' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.eventVenue.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'EVENT_VENUE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check for name conflict
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.eventVenue.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (nameConflict) {
        throw new HttpException({ error: 'EVENT_VENUE_NAME_EXISTS' }, HttpStatus.CONFLICT);
      }
    }

    // Update venue
    await this.prisma.eventVenue.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        venueType: dto.venueType ?? existing.venueType,
        address: dto.address ?? existing.address,
        parking: dto.parking ?? existing.parking,
        areas: dto.areas ?? existing.areas,
        techInfrastructure: dto.techInfrastructure ?? existing.techInfrastructure,
        serviceInfrastructure: dto.serviceInfrastructure ?? existing.serviceInfrastructure,
        technicalTeam: dto.technicalTeam ?? existing.technicalTeam,
        availableMonths: dto.availableMonths ?? existing.availableMonths,
        isActive: dto.isActive ?? existing.isActive,
        notes: dto.notes ?? existing.notes,
        metadata: dto.metadata ?? existing.metadata,
      },
    });

    // Update event type associations if provided
    if (dto.allowedEventTypeIds !== undefined) {
      // Delete existing associations
      await this.prisma.eventVenueEventType.deleteMany({ where: { venueId: id } });

      // Create new associations
      if (dto.allowedEventTypeIds.length > 0) {
        await this.prisma.eventVenueEventType.createMany({
          data: dto.allowedEventTypeIds.map((eventTypeId: string) => ({
            tenantId,
            venueId: id,
            eventTypeId,
          })),
        });
      }
    }

    return this.getVenueWithEventTypes(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete event venue' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.eventVenue.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'EVENT_VENUE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Delete venue (cascades to event type associations)
    await this.prisma.eventVenue.delete({ where: { id } });
    return existing;
  }

  // Helper method to get venue with event types
  private async getVenueWithEventTypes(id: string, tenantId: string) {
    const venue = await this.prisma.eventVenue.findFirst({
      where: { id, tenantId },
      include: {
        venueEventTypes: {
          include: { eventType: true },
        },
      },
    });

    if (!venue) return null;

    return {
      ...venue,
      allowedEventTypeIds: venue.venueEventTypes.map((vet) => vet.eventTypeId),
      allowedEventTypes: venue.venueEventTypes.map((vet) => vet.eventType),
      venueEventTypes: undefined,
    };
  }
}

// ============================================
// TABLE NAMES CONTROLLER
// ============================================

@ApiTags('Taxonomy - Table Names')
@Controller('taxonomy/table-names')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class TableNamesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new table name' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.tableName.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new HttpException({ error: 'TABLE_NAME_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.tableName.create({
      data: {
        tenantId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        defaultCapacity: dto.defaultCapacity,
        displayOrder: dto.displayOrder,
        tableType: dto.tableType,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List table names' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.tableName.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.tableName.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table name by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const tableName = await this.prisma.tableName.findFirst({ where: { id, tenantId } });
    if (!tableName) throw new HttpException({ error: 'TABLE_NAME_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return tableName;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update table name' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.tableName.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'TABLE_NAME_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check for name conflict if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.tableName.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (nameConflict) {
        throw new HttpException({ error: 'TABLE_NAME_EXISTS' }, HttpStatus.CONFLICT);
      }
    }

    return this.prisma.tableName.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        icon: dto.icon !== undefined ? dto.icon : existing.icon,
        color: dto.color !== undefined ? dto.color : existing.color,
        defaultCapacity: dto.defaultCapacity !== undefined ? dto.defaultCapacity : existing.defaultCapacity,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : existing.displayOrder,
        tableType: dto.tableType !== undefined ? dto.tableType : existing.tableType,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete table name' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.tableName.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'TABLE_NAME_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.tableName.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// AVATARS CONTROLLER
// ============================================

@ApiTags('Taxonomy - Avatars')
@Controller('taxonomy/avatars')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class AvatarsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new avatar' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const code = dto.code?.toLowerCase().replace(/\s+/g, '_');

    const existing = await this.prisma.participantAvatar.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'AVATAR_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.participantAvatar.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        emoji: dto.emoji,
        color: dto.color,
        avatarUrl: dto.avatarUrl,
        avatarTypeId: dto.avatarTypeId,
        isDefault: dto.isDefault ?? false,
        displayOrder: dto.displayOrder,
      },
      include: {
        avatarType: true,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List avatars' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toLowerCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.participantAvatar.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          avatarType: true,
        },
      }),
      this.prisma.participantAvatar.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get avatar by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const avatar = await this.prisma.participantAvatar.findFirst({
      where: { id, tenantId },
      include: { avatarType: true },
    });
    if (!avatar) throw new HttpException({ error: 'AVATAR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return avatar;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update avatar' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.participantAvatar.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'AVATAR_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.participantAvatar.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        emoji: dto.emoji ?? existing.emoji,
        color: dto.color ?? existing.color,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : existing.avatarUrl,
        avatarTypeId: dto.avatarTypeId !== undefined ? dto.avatarTypeId : existing.avatarTypeId,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : existing.displayOrder,
      },
      include: {
        avatarType: true,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete avatar' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.participantAvatar.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'AVATAR_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Don't allow deleting default avatars
    if (existing.isDefault) {
      throw new HttpException({ error: 'CANNOT_DELETE_DEFAULT_AVATAR' }, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.participantAvatar.delete({ where: { id } });
    return existing;
  }
}


// ============================================
// AVATAR TYPES CONTROLLER
// ============================================

@Controller('settings/avatar-types')
@ApiTags('Taxonomy - Avatar Types')
export class AvatarTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new avatar type' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.avatarType.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new HttpException({ error: 'AVATAR_TYPE_NAME_EXISTS' }, HttpStatus.CONFLICT);
    }

    return this.prisma.avatarType.create({
      data: {
        tenantId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        displayOrder: dto.displayOrder,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List avatar types' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 100,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.avatarType.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { avatars: true },
          },
        },
      }),
      this.prisma.avatarType.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get avatar type by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const avatarType = await this.prisma.avatarType.findFirst({ where: { id, tenantId } });
    if (!avatarType) throw new HttpException({ error: 'AVATAR_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return avatarType;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update avatar type' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.avatarType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'AVATAR_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.avatarType.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        icon: dto.icon !== undefined ? dto.icon : existing.icon,
        color: dto.color !== undefined ? dto.color : existing.color,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : existing.displayOrder,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete avatar type' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.avatarType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'AVATAR_TYPE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check if avatar type is in use
    const avatarsCount = await this.prisma.participantAvatar.count({
      where: { avatarTypeId: id, tenantId },
    });

    if (avatarsCount > 0) {
      throw new HttpException(
        { error: 'AVATAR_TYPE_IN_USE', message: 'Cannot delete avatar type that is in use' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.avatarType.delete({ where: { id } });
    return existing;
  }
}

// ============================================
// SYSTEM CAPABILITIES CONTROLLER
// ============================================

@ApiTags('Settings - System Capabilities')
@Controller('settings/capabilities')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class SystemCapabilitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new system capability' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: any,
  ) {
    // Check for duplicate name
    const existingName = await this.prisma.systemCapability.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existingName) {
      throw new HttpException(
        { error: 'CAPABILITY_NAME_EXISTS', message: `Capability with name "${dto.name}" already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Check for duplicate code
    const existingCode = await this.prisma.systemCapability.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });
    if (existingCode) {
      throw new HttpException(
        { error: 'CAPABILITY_CODE_EXISTS', message: `Capability with code "${dto.code}" already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Verify SystemResource exists
    const resource = await this.prisma.systemResource.findFirst({
      where: { id: dto.systemResourceId, tenantId },
    });
    if (!resource) {
      throw new HttpException(
        { error: 'RESOURCE_NOT_FOUND', message: 'System Resource not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.systemCapability.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        code: dto.code.toUpperCase(),
        systemResourceId: dto.systemResourceId,
        inputSchema: dto.inputSchema,
        outputSchema: dto.outputSchema,
        timeout: dto.timeout,
        retryPolicy: dto.retryPolicy,
        metadata: dto.metadata ?? {},
        tags: dto.tags ?? [],
        isActive: dto.isActive ?? true,
      },
      include: {
        systemResource: true,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List system capabilities' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('systemResourceId') systemResourceId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (systemResourceId) {
      where.systemResourceId = systemResourceId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [items, total] = await Promise.all([
      this.prisma.systemCapability.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ name: 'asc' }],
        include: {
          systemResource: {
            select: {
              id: true,
              name: true,
              type: true,
              subtype: true,
              endpoint: true,
            },
          },
        },
      }),
      this.prisma.systemCapability.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get capability by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const capability = await this.prisma.systemCapability.findFirst({
      where: { id, tenantId },
      include: {
        systemResource: true,
      },
    });

    if (!capability) {
      throw new HttpException(
        { error: 'CAPABILITY_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return capability;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update capability' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const existing = await this.prisma.systemCapability.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'CAPABILITY_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check name uniqueness if changed
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.systemCapability.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (duplicate) {
        throw new HttpException(
          { error: 'CAPABILITY_NAME_EXISTS' },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Verify SystemResource if changed
    if (dto.systemResourceId && dto.systemResourceId !== existing.systemResourceId) {
      const resource = await this.prisma.systemResource.findFirst({
        where: { id: dto.systemResourceId, tenantId },
      });
      if (!resource) {
        throw new HttpException(
          { error: 'RESOURCE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return this.prisma.systemCapability.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        systemResourceId: dto.systemResourceId,
        inputSchema: dto.inputSchema,
        outputSchema: dto.outputSchema,
        timeout: dto.timeout,
        retryPolicy: dto.retryPolicy,
        metadata: dto.metadata,
        tags: dto.tags,
        isActive: dto.isActive,
      },
      include: {
        systemResource: true,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete capability' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const existing = await this.prisma.systemCapability.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'CAPABILITY_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // TODO: Check if capability is being used by workflow triggers
    // For now, just delete

    await this.prisma.systemCapability.delete({ where: { id } });
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test capability execution' })
  async test(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { payload: any },
  ) {
    const capability = await this.prisma.systemCapability.findFirst({
      where: { id, tenantId },
      include: { systemResource: true },
    });

    if (!capability) {
      throw new HttpException(
        { error: 'CAPABILITY_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      // TODO: Implement actual execution logic
      // This is a placeholder that would call the SystemResource with the payload
      const startTime = Date.now();

      // Simulate execution (replace with actual HTTP call to systemResource)
      await new Promise(resolve => setTimeout(resolve, 100));

      const responseTime = Date.now() - startTime;
      const testedAt = new Date();

      // Update test results
      await this.prisma.systemCapability.update({
        where: { id },
        data: {
          lastTestedAt: testedAt,
          lastTestResult: 'SUCCESS',
        },
      });

      return {
        success: true,
        message: 'Capability executed successfully',
        responseTime,
        testedAt: testedAt.toISOString(),
        result: { mock: true, payload: dto.payload },
      };
    } catch (error) {
      await this.prisma.systemCapability.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestResult: 'FAILURE',
        },
      });

      return {
        success: false,
        message: error.message || 'Capability execution failed',
        testedAt: new Date().toISOString(),
      };
    }
  }
}
