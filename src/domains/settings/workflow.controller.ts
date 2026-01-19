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
    const existing = await this.prisma.cycle.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existing) {
      throw new HttpException({ error: 'CYCLE_CODE_EXISTS' }, HttpStatus.CONFLICT);
    }

    // If this is the first cycle or marked as current, update other cycles
    if (dto.isCurrent) {
      await this.prisma.cycle.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.cycle.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
        status: dto.status ?? 'PLANNED',
        metadata: dto.metadata ?? {},
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

    const [items, total] = await Promise.all([
      this.prisma.cycle.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      }),
      this.prisma.cycle.count({ where }),
    ]);

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

    // If setting as current, unset other cycles
    if (dto.isCurrent && !existing.isCurrent) {
      await this.prisma.cycle.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.cycle.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        isCurrent: dto.isCurrent ?? existing.isCurrent,
        status: dto.status ?? existing.status,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
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
