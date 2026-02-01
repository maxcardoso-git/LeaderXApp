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

    const created = await this.prisma.cycle.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        pipelineId: dto.pipelineId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 year
        isCurrent,
        status: dto.status ?? 'ACTIVE',
        metadata,
      },
      include: {
        pipeline: { select: { id: true, key: true, name: true } },
      },
    });

    return {
      ...created,
      isDefault: created.isCurrent,
      phaseBlocks: (created.metadata as any)?.phaseBlocks || {},
    };
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
        include: {
          pipeline: { select: { id: true, key: true, name: true } },
        },
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
        pipelineId: dto.pipelineId !== undefined ? dto.pipelineId : existing.pipelineId,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        isCurrent: isCurrent ?? existing.isCurrent,
        status: dto.status ?? existing.status,
        metadata,
      },
      include: {
        pipeline: { select: { id: true, key: true, name: true } },
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

// ============================================
// AVATAR BENEFIT CONFIG CONTROLLER
// ============================================

@ApiTags('Workflow - Avatar Benefits')
@Controller('workflow/avatar-benefits')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class AvatarBenefitConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('matrix')
  @ApiOperation({ summary: 'Get the full avatar x benefit matrix' })
  async getMatrix(@Headers('x-tenant-id') tenantId: string) {
    // Get all avatars and benefits
    const [avatars, benefits, configs] = await Promise.all([
      this.prisma.participantAvatar.findMany({
        where: { tenantId },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.subscriberBenefit.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.avatarBenefitConfig.findMany({
        where: { tenantId },
      }),
    ]);

    // Build config map for quick lookup
    const configMap = new Map<string, any>();
    configs.forEach((config) => {
      configMap.set(`${config.avatarId}-${config.benefitId}`, config);
    });

    // Build matrix with default values for missing configs
    const matrix = avatars.map((avatar) => ({
      avatar: {
        id: avatar.id,
        code: avatar.code,
        name: avatar.name,
        emoji: avatar.emoji,
        color: avatar.color,
      },
      benefits: benefits.map((benefit) => {
        const config = configMap.get(`${avatar.id}-${benefit.id}`);
        return {
          benefitId: benefit.id,
          benefitName: benefit.name,
          benefitCode: benefit.code,
          benefitIcon: benefit.icon,
          status: config?.status || 'FREE',
          pointCost: config?.pointCost || 0,
          isEnabled: config?.isEnabled ?? true,
          configId: config?.id || null,
        };
      }),
    }));

    return {
      avatars: avatars.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        emoji: a.emoji,
        color: a.color,
      })),
      benefits: benefits.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        icon: b.icon,
        type: b.type,
      })),
      matrix,
    };
  }

  @Put('matrix')
  @ApiOperation({ summary: 'Update multiple avatar x benefit configurations' })
  async updateMatrix(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { configs: Array<{ avatarId: string; benefitId: string; status: string; pointCost: number; isEnabled: boolean }> },
  ) {
    const results = await Promise.all(
      dto.configs.map(async (config) => {
        return this.prisma.avatarBenefitConfig.upsert({
          where: {
            tenantId_avatarId_benefitId: {
              tenantId,
              avatarId: config.avatarId,
              benefitId: config.benefitId,
            },
          },
          create: {
            tenantId,
            avatarId: config.avatarId,
            benefitId: config.benefitId,
            status: config.status,
            pointCost: config.pointCost,
            isEnabled: config.isEnabled,
          },
          update: {
            status: config.status,
            pointCost: config.pointCost,
            isEnabled: config.isEnabled,
          },
        });
      }),
    );

    return { updated: results.length };
  }

  @Put(':avatarId/:benefitId')
  @ApiOperation({ summary: 'Update a single avatar x benefit configuration' })
  async updateConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Param('avatarId') avatarId: string,
    @Param('benefitId') benefitId: string,
    @Body() dto: { status?: string; pointCost?: number; isEnabled?: boolean },
  ) {
    // Verify avatar and benefit exist
    const [avatar, benefit] = await Promise.all([
      this.prisma.participantAvatar.findFirst({ where: { id: avatarId, tenantId } }),
      this.prisma.subscriberBenefit.findFirst({ where: { id: benefitId, tenantId } }),
    ]);

    if (!avatar) throw new HttpException({ error: 'AVATAR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (!benefit) throw new HttpException({ error: 'BENEFIT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const config = await this.prisma.avatarBenefitConfig.upsert({
      where: {
        tenantId_avatarId_benefitId: { tenantId, avatarId, benefitId },
      },
      create: {
        tenantId,
        avatarId,
        benefitId,
        status: dto.status || 'FREE',
        pointCost: dto.pointCost || 0,
        isEnabled: dto.isEnabled ?? true,
      },
      update: {
        status: dto.status,
        pointCost: dto.pointCost,
        isEnabled: dto.isEnabled,
      },
      include: {
        avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
        benefit: { select: { id: true, code: true, name: true, icon: true } },
      },
    });

    return config;
  }

  @Get(':avatarId/:benefitId')
  @ApiOperation({ summary: 'Get a single avatar x benefit configuration' })
  async getConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Param('avatarId') avatarId: string,
    @Param('benefitId') benefitId: string,
  ) {
    const config = await this.prisma.avatarBenefitConfig.findUnique({
      where: {
        tenantId_avatarId_benefitId: { tenantId, avatarId, benefitId },
      },
      include: {
        avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
        benefit: { select: { id: true, code: true, name: true, icon: true } },
      },
    });

    if (!config) {
      // Return default values if no config exists
      return {
        avatarId,
        benefitId,
        status: 'FREE',
        pointCost: 0,
        isEnabled: true,
      };
    }

    return config;
  }
}
