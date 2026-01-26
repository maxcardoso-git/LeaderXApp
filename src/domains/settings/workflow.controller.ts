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

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// CYCLES CONTROLLER
// ============================================

@ApiTags('Workflow - Cycles')
@Controller('workflow/cycles')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class CyclesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cycle' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Generate code from name if not provided
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);

    const existing = await this.prisma.cycle.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException({ error: 'CYCLE_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Support both isCurrent (backend) and isDefault (frontend)
    const isCurrent = dto.isCurrent ?? dto.isDefault ?? false;

    // If this is the first cycle or marked as current, update other cycles
    if (isCurrent) {
      await this.prisma.cycle.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    // Store phaseBlocks in metadata if provided
    const metadata = dto.metadata ?? {};
    if (dto.phaseBlocks) {
      metadata.phaseBlocks = dto.phaseBlocks;
    }

    return this.prisma.cycle.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 year
        isCurrent,
        status: dto.status ?? 'ACTIVE',
        metadata,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List cycles' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;

    const [rawItems, total] = await Promise.all([
      this.prisma.cycle.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      }),
      this.prisma.cycle.count({ where }),
    ]);

    // Transform items to include isDefault and phaseBlocks at root level
    const items = rawItems.map((item) => ({
      ...item,
      isDefault: item.isCurrent,
      phaseBlocks: (item.metadata as any)?.phaseBlocks || {},
    }));

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active cycle' })
  async getCurrent(@Headers('x-tenant-id') tenantId: string) {
    const cycle = await this.prisma.cycle.findFirst({
      where: { tenantId, isCurrent: true },
    });

    if (!cycle) {
      // Try to find the most recent active cycle
      const activeCycle = await this.prisma.cycle.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      });

      if (!activeCycle) {
        throw new HttpException({ error: 'NO_CURRENT_CYCLE' }, HttpStatus.NOT_FOUND);
      }

      return activeCycle;
    }

    return cycle;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cycle by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const cycle = await this.prisma.cycle.findFirst({ where: { id, tenantId } });
    if (!cycle) throw new HttpException({ error: 'CYCLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return cycle;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cycle' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.cycle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'CYCLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Support both isCurrent (backend) and isDefault (frontend)
    const isCurrent = dto.isCurrent ?? dto.isDefault;

    // If setting as current, unset other cycles
    if (isCurrent && !existing.isCurrent) {
      await this.prisma.cycle.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    // Merge phaseBlocks into metadata
    let metadata = existing.metadata as any || {};
    if (dto.phaseBlocks) {
      metadata = { ...metadata, phaseBlocks: dto.phaseBlocks };
    } else if (dto.metadata) {
      metadata = dto.metadata;
    }

    const updated = await this.prisma.cycle.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        isCurrent: isCurrent ?? existing.isCurrent,
        status: dto.status ?? existing.status,
        metadata,
      },
    });

    // Return with frontend-friendly format
    return {
      ...updated,
      isDefault: updated.isCurrent,
      phaseBlocks: (updated.metadata as any)?.phaseBlocks || {},
    };
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Set cycle as current' })
  async activate(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.cycle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'CYCLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Unset other cycles
    await this.prisma.cycle.updateMany({
      where: { tenantId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.cycle.update({
      where: { id },
      data: { isCurrent: true, status: 'ACTIVE' },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/archive cycle' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.cycle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'CYCLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Don't delete current cycle, just archive it
    if (existing.isCurrent) {
      return this.prisma.cycle.update({
        where: { id },
        data: { status: 'ARCHIVED', isCurrent: false },
      });
    }

    await this.prisma.cycle.delete({ where: { id } });
    return existing;
  }
}
