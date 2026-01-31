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
import { IsNumber, Min, IsString, IsOptional, IsNotEmpty } from 'class-validator';

// ============================================
// Reorder DTO
// ============================================
class ReorderStageDto {
  @IsNumber()
  @Min(0)
  newOrder: number;
}

class AddTransitionDto {
  @IsString()
  @IsNotEmpty()
  toStageId: string;
}

class AddFormRuleDto {
  @IsString()
  @IsOptional()
  formDefinitionId?: string;

  @IsString()
  @IsOptional()
  externalFormId?: string;

  @IsString()
  @IsOptional()
  externalFormName?: string;

  @IsString()
  @IsOptional()
  defaultFormStatus?: string;

  @IsString()
  @IsOptional()
  uniqueKeyFieldId?: string;
}

class AddAvatarRuleDto {
  @IsString()
  @IsNotEmpty()
  avatarId: string;

  @IsString()
  @IsOptional()
  approvalRule?: string; // ONE_MEMBER, HALF_MEMBERS, MAJORITY

  @IsNumber()
  @IsOptional()
  ruleOrder?: number;
}

class UpdateAvatarRuleDto {
  @IsString()
  @IsOptional()
  approvalRule?: string;

  @IsNumber()
  @IsOptional()
  ruleOrder?: number;
}

// ============================================
// DTOs & Types
// ============================================

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// PIPELINES CONTROLLER
// ============================================

@ApiTags('PLM - Pipelines')
@Controller('plm/pipelines')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class PipelinesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Validate unique key
    const existing = await this.prisma.plmPipeline.findFirst({
      where: { tenantId, key: dto.key },
    });
    if (existing) {
      throw new HttpException({ error: 'PIPELINE_KEY_EXISTS' }, HttpStatus.BAD_REQUEST);
    }

    // Create pipeline with initial version
    const pipeline = await this.prisma.plmPipeline.create({
      data: {
        tenantId,
        key: dto.key,
        name: dto.name,
        description: dto.description || null,
        projectId: dto.projectId || null,
        projectName: dto.projectName || null,
        lifecycleStatus: 'DRAFT',
        createdBy: dto.createdBy || null,
      },
    });

    // Create initial version
    await this.prisma.plmPipelineVersion.create({
      data: {
        tenantId,
        pipelineId: pipeline.id,
        versionNumber: 1,
        versionStatus: 'DRAFT',
      },
    });

    return pipeline;
  }

  @Get()
  @ApiOperation({ summary: 'List pipelines' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.lifecycleStatus = status;
    if (projectId) where.projectId = projectId;

    const [items, total] = await Promise.all([
      this.prisma.plmPipeline.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          _count: {
            select: { versions: true, cards: true, permissions: true },
          },
        },
      }),
      this.prisma.plmPipeline.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id, tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        _count: {
          select: { cards: true, permissions: true },
        },
      },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return pipeline;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update pipeline' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipeline.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        projectId: dto.projectId !== undefined ? dto.projectId : existing.projectId,
        projectName: dto.projectName !== undefined ? dto.projectName : existing.projectName,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete pipeline' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check for cards
    const cardsCount = await this.prisma.plmCard.count({ where: { pipelineId: id } });
    if (cardsCount > 0) {
      throw new HttpException(
        { error: 'PIPELINE_HAS_CARDS', message: `Pipeline has ${cardsCount} card(s). Archive instead.` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.plmPipeline.delete({ where: { id } });
    return existing;
  }

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish pipeline version' })
  async publish(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { publishedBy?: string },
  ) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const latestVersion = pipeline.versions[0];
    if (!latestVersion) {
      throw new HttpException({ error: 'NO_VERSION_TO_PUBLISH' }, HttpStatus.BAD_REQUEST);
    }

    // Validate stages exist
    const stagesCount = await this.prisma.plmStage.count({
      where: { pipelineVersionId: latestVersion.id },
    });
    if (stagesCount === 0) {
      throw new HttpException({ error: 'NO_STAGES_DEFINED' }, HttpStatus.BAD_REQUEST);
    }

    // Validate initial stage exists
    const initialStage = await this.prisma.plmStage.findFirst({
      where: { pipelineVersionId: latestVersion.id, isInitial: true },
    });
    if (!initialStage) {
      throw new HttpException({ error: 'NO_INITIAL_STAGE' }, HttpStatus.BAD_REQUEST);
    }

    // Update version and pipeline
    await this.prisma.plmPipelineVersion.update({
      where: { id: latestVersion.id },
      data: {
        versionStatus: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: dto.publishedBy || 'system',
      },
    });

    return this.prisma.plmPipeline.update({
      where: { id },
      data: {
        lifecycleStatus: 'PUBLISHED',
        publishedVersion: latestVersion.versionNumber,
      },
    });
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Move pipeline to test status' })
  async setTestStatus(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipeline.update({
      where: { id },
      data: { lifecycleStatus: 'TEST' },
    });
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close pipeline' })
  async close(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipeline.update({
      where: { id },
      data: { lifecycleStatus: 'CLOSED' },
    });
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive pipeline' })
  async archive(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipeline.update({
      where: { id },
      data: { lifecycleStatus: 'ARCHIVED' },
    });
  }

  @Post(':id/new-version')
  @ApiOperation({ summary: 'Create new draft version from published pipeline' })
  async createNewVersion(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id, tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            stages: true,
            transitions: true,
          },
        },
      },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const latestVersion = pipeline.versions[0];
    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Create new version
    const newVersion = await this.prisma.plmPipelineVersion.create({
      data: {
        tenantId,
        pipelineId: id,
        versionNumber: newVersionNumber,
        versionStatus: 'DRAFT',
      },
    });

    // Copy stages if there's a previous version
    if (latestVersion && latestVersion.stages.length > 0) {
      const stageIdMap = new Map<string, string>();

      // First, create all stages
      for (const stage of latestVersion.stages) {
        const newStage = await this.prisma.plmStage.create({
          data: {
            tenantId,
            pipelineVersionId: newVersion.id,
            name: stage.name,
            stageOrder: stage.stageOrder,
            classification: stage.classification,
            color: stage.color,
            isInitial: stage.isInitial,
            isFinal: stage.isFinal,
            wipLimit: stage.wipLimit,
            slaHours: stage.slaHours,
            active: stage.active,
          },
        });
        stageIdMap.set(stage.id, newStage.id);
      }

      // Then, copy transitions with new stage IDs
      for (const transition of latestVersion.transitions) {
        const newFromStageId = stageIdMap.get(transition.fromStageId);
        const newToStageId = stageIdMap.get(transition.toStageId);
        if (newFromStageId && newToStageId) {
          await this.prisma.plmStageTransition.create({
            data: {
              tenantId,
              pipelineVersionId: newVersion.id,
              fromStageId: newFromStageId,
              toStageId: newToStageId,
            },
          });
        }
      }
    }

    // Update pipeline to DRAFT status
    await this.prisma.plmPipeline.update({
      where: { id },
      data: { lifecycleStatus: 'DRAFT' },
    });

    return newVersion;
  }

  // ============================================
  // VERSIONS
  // ============================================

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get pipeline versions' })
  async getVersions(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({ where: { id, tenantId } });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipelineVersion.findMany({
      where: { pipelineId: id },
      orderBy: { versionNumber: 'desc' },
      include: {
        _count: {
          select: { stages: true, transitions: true },
        },
      },
    });
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific pipeline version with stages' })
  async getVersion(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId: id, tenantId },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
          include: {
            formAttachRules: true,
            triggers: true,
          },
        },
        transitions: {
          include: {
            fromStage: { select: { id: true, name: true, color: true } },
            toStage: { select: { id: true, name: true, color: true } },
            rules: true,
          },
        },
      },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return version;
  }
}

// ============================================
// STAGES CONTROLLER
// ============================================

@ApiTags('PLM - Stages')
@Controller('plm/pipelines/:pipelineId/versions/:versionId/stages')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class StagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stage' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Body() dto: any,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    // Get next stage order
    const maxOrder = await this.prisma.plmStage.aggregate({
      where: { pipelineVersionId: versionId },
      _max: { stageOrder: true },
    });
    const nextOrder = (maxOrder._max.stageOrder || 0) + 1;

    return this.prisma.plmStage.create({
      data: {
        tenantId,
        pipelineVersionId: versionId,
        name: dto.name,
        stageOrder: dto.stageOrder ?? nextOrder,
        classification: dto.classification || 'NOT_STARTED',
        color: dto.color || '#6B7280',
        isInitial: dto.isInitial || false,
        isFinal: dto.isFinal || false,
        wipLimit: dto.wipLimit,
        slaHours: dto.slaHours,
        active: dto.active !== false,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List stages for a version' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStage.findMany({
      where: { pipelineVersionId: versionId },
      orderBy: { stageOrder: 'asc' },
      include: {
        formAttachRules: true,
        triggers: {
          include: { conditions: true },
        },
        avatarRules: {
          orderBy: { ruleOrder: 'asc' },
          include: {
            avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
          },
        },
        fromTransitions: {
          include: { toStage: { select: { id: true, name: true, color: true } } },
        },
        toTransitions: {
          include: { fromStage: { select: { id: true, name: true, color: true } } },
        },
        _count: {
          select: { fromTransitions: true, toTransitions: true },
        },
      },
    });
  }

  @Get(':stageId')
  @ApiOperation({ summary: 'Get stage by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
  ) {
    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId, tenantId },
      include: {
        formAttachRules: true,
        triggers: {
          include: { conditions: true },
        },
        avatarRules: {
          orderBy: { ruleOrder: 'asc' },
          include: {
            avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
          },
        },
        fromTransitions: {
          include: { toStage: { select: { id: true, name: true, color: true } } },
        },
        toTransitions: {
          include: { fromStage: { select: { id: true, name: true, color: true } } },
        },
      },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return stage;
  }

  @Put(':stageId/reorder')
  @ApiOperation({ summary: 'Reorder stage' })
  async reorder(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: ReorderStageDto,
  ) {
    try {
      console.log('[REORDER] Starting:', { tenantId, pipelineId, versionId, stageId, dto });

      const version = await this.prisma.plmPipelineVersion.findFirst({
        where: { id: versionId, pipelineId, tenantId },
      });
      if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      if (version.versionStatus !== 'DRAFT') {
        throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
      }

      const stage = await this.prisma.plmStage.findFirst({
        where: { id: stageId, pipelineVersionId: versionId, tenantId },
      });
      if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

      const oldOrder = stage.stageOrder;
      const newOrder = dto.newOrder;

      console.log('[REORDER] Moving stage from order', oldOrder, 'to', newOrder);

      if (oldOrder === newOrder) return stage;

      // Use transaction to handle unique constraint on (pipelineVersionId, stageOrder)
      const result = await this.prisma.$transaction(async (tx) => {
        // Step 1: Set target stage to temporary value to avoid unique constraint
        console.log('[REORDER] Step 1: Setting stage to temporary order -1');
        await tx.plmStage.update({
          where: { id: stageId },
          data: { stageOrder: -1 },
        });

        // Step 2: Shift other stages
        if (oldOrder < newOrder) {
          // Moving down: decrease order of stages between old and new
          console.log('[REORDER] Step 2: Moving down - decrementing stages between', oldOrder, 'and', newOrder);
          await tx.plmStage.updateMany({
            where: {
              pipelineVersionId: versionId,
              tenantId,
              stageOrder: { gt: oldOrder, lte: newOrder },
            },
            data: { stageOrder: { decrement: 1 } },
          });
        } else {
          // Moving up: increase order of stages between new and old
          console.log('[REORDER] Step 2: Moving up - incrementing stages between', newOrder, 'and', oldOrder);
          await tx.plmStage.updateMany({
            where: {
              pipelineVersionId: versionId,
              tenantId,
              stageOrder: { gte: newOrder, lt: oldOrder },
            },
            data: { stageOrder: { increment: 1 } },
          });
        }

        // Step 3: Set target stage to final position
        console.log('[REORDER] Step 3: Setting stage to final order', newOrder);
        return tx.plmStage.update({
          where: { id: stageId },
          data: { stageOrder: newOrder },
        });
      });

      console.log('[REORDER] Success:', result);
      return result;
    } catch (error) {
      console.error('[REORDER] Error:', error);
      throw error;
    }
  }

  @Put(':stageId')
  @ApiOperation({ summary: 'Update stage' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: any,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId, tenantId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStage.update({
      where: { id: stageId },
      data: {
        name: dto.name ?? stage.name,
        stageOrder: dto.stageOrder ?? stage.stageOrder,
        classification: dto.classification ?? stage.classification,
        color: dto.color ?? stage.color,
        isInitial: dto.isInitial ?? stage.isInitial,
        isFinal: dto.isFinal ?? stage.isFinal,
        wipLimit: dto.wipLimit !== undefined ? dto.wipLimit : stage.wipLimit,
        slaHours: dto.slaHours !== undefined ? dto.slaHours : stage.slaHours,
        active: dto.active ?? stage.active,
      },
    });
  }

  @Delete(':stageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete stage' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId, tenantId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmStage.delete({ where: { id: stageId } });
    return stage;
  }

  // ============================================
  // TRANSITIONS
  // ============================================

  @Post(':stageId/transitions')
  @ApiOperation({ summary: 'Add transition from this stage' })
  async addTransition(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: AddTransitionDto,
  ) {
    console.log('[ADD_TRANSITION] Starting:', { tenantId, pipelineId, versionId, stageId, dto });
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    // Validate both stages exist
    const [fromStage, toStage] = await Promise.all([
      this.prisma.plmStage.findFirst({ where: { id: stageId, pipelineVersionId: versionId } }),
      this.prisma.plmStage.findFirst({ where: { id: dto.toStageId, pipelineVersionId: versionId } }),
    ]);
    if (!fromStage || !toStage) {
      throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check if transition already exists
    const existing = await this.prisma.plmStageTransition.findFirst({
      where: { pipelineVersionId: versionId, fromStageId: stageId, toStageId: dto.toStageId },
    });
    if (existing) {
      throw new HttpException({ error: 'TRANSITION_EXISTS' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.plmStageTransition.create({
      data: {
        tenantId,
        pipelineVersionId: versionId,
        fromStageId: stageId,
        toStageId: dto.toStageId,
      },
      include: {
        fromStage: { select: { id: true, name: true, color: true } },
        toStage: { select: { id: true, name: true, color: true } },
      },
    });
  }

  @Delete(':stageId/transitions/:toStageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove transition from this stage' })
  async removeTransition(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('toStageId') toStageId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const transition = await this.prisma.plmStageTransition.findFirst({
      where: { pipelineVersionId: versionId, fromStageId: stageId, toStageId },
    });
    if (!transition) throw new HttpException({ error: 'TRANSITION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmStageTransition.delete({ where: { id: transition.id } });
    return transition;
  }

  // ============================================
  // FORM ATTACH RULES
  // ============================================

  @Post(':stageId/form-rules')
  @ApiOperation({ summary: 'Add form attach rule to stage' })
  async addFormRule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: AddFormRuleDto,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStageFormAttachRule.create({
      data: {
        tenantId,
        stageId,
        formDefinitionId: dto.formDefinitionId || null,
        externalFormId: dto.externalFormId || null,
        externalFormName: dto.externalFormName || null,
        defaultFormStatus: dto.defaultFormStatus || 'TO_FILL',
        uniqueKeyFieldId: dto.uniqueKeyFieldId || null,
      },
    });
  }

  @Delete(':stageId/form-rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove form attach rule' })
  async removeFormRule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('ruleId') ruleId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const rule = await this.prisma.plmStageFormAttachRule.findFirst({
      where: { id: ruleId, stageId, tenantId },
    });
    if (!rule) throw new HttpException({ error: 'RULE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmStageFormAttachRule.delete({ where: { id: ruleId } });
    return rule;
  }

  // ============================================
  // TRIGGERS
  // ============================================

  @Post(':stageId/triggers')
  @ApiOperation({ summary: 'Add trigger to stage' })
  async addTrigger(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: any,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Get next execution order
    const maxOrder = await this.prisma.plmStageTrigger.aggregate({
      where: { stageId },
      _max: { executionOrder: true },
    });
    const nextOrder = (maxOrder._max.executionOrder || 0) + 1;

    return this.prisma.plmStageTrigger.create({
      data: {
        tenantId,
        stageId,
        integrationId: dto.integrationId || null,
        integrationName: dto.integrationName || null,
        integrationKey: dto.integrationKey || null,
        eventType: dto.eventType || 'CARD_MOVEMENT',
        fromStageId: dto.fromStageId || null,
        formDefinitionId: dto.formDefinitionId || null,
        fieldId: dto.fieldId || null,
        executionOrder: dto.executionOrder ?? nextOrder,
        enabled: dto.enabled !== false,
        httpMethod: dto.httpMethod || null,
        endpoint: dto.endpoint || null,
        defaultPayload: dto.defaultPayload || null,
      },
      include: { conditions: true },
    });
  }

  @Put(':stageId/triggers/:triggerId')
  @ApiOperation({ summary: 'Update trigger' })
  async updateTrigger(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('triggerId') triggerId: string,
    @Body() dto: any,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const trigger = await this.prisma.plmStageTrigger.findFirst({
      where: { id: triggerId, stageId, tenantId },
    });
    if (!trigger) throw new HttpException({ error: 'TRIGGER_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStageTrigger.update({
      where: { id: triggerId },
      data: {
        integrationId: dto.integrationId !== undefined ? dto.integrationId : trigger.integrationId,
        integrationName: dto.integrationName !== undefined ? dto.integrationName : trigger.integrationName,
        integrationKey: dto.integrationKey !== undefined ? dto.integrationKey : trigger.integrationKey,
        eventType: dto.eventType ?? trigger.eventType,
        fromStageId: dto.fromStageId !== undefined ? dto.fromStageId : trigger.fromStageId,
        formDefinitionId: dto.formDefinitionId !== undefined ? dto.formDefinitionId : trigger.formDefinitionId,
        fieldId: dto.fieldId !== undefined ? dto.fieldId : trigger.fieldId,
        executionOrder: dto.executionOrder ?? trigger.executionOrder,
        enabled: dto.enabled ?? trigger.enabled,
        httpMethod: dto.httpMethod !== undefined ? dto.httpMethod : trigger.httpMethod,
        endpoint: dto.endpoint !== undefined ? dto.endpoint : trigger.endpoint,
        defaultPayload: dto.defaultPayload !== undefined ? dto.defaultPayload : trigger.defaultPayload,
      },
      include: { conditions: true },
    });
  }

  @Delete(':stageId/triggers/:triggerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove trigger' })
  async removeTrigger(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('triggerId') triggerId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const trigger = await this.prisma.plmStageTrigger.findFirst({
      where: { id: triggerId, stageId, tenantId },
    });
    if (!trigger) throw new HttpException({ error: 'TRIGGER_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmStageTrigger.delete({ where: { id: triggerId } });
    return trigger;
  }

  // ============================================
  // AVATAR RULES
  // ============================================

  @Get(':stageId/avatar-rules')
  @ApiOperation({ summary: 'Get avatar rules for a stage' })
  async getAvatarRules(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
  ) {
    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId, tenantId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStageAvatarRule.findMany({
      where: { stageId },
      orderBy: { ruleOrder: 'asc' },
      include: {
        avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
      },
    });
  }

  @Post(':stageId/avatar-rules')
  @ApiOperation({ summary: 'Add avatar rule to stage' })
  async addAvatarRule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: AddAvatarRuleDto,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const stage = await this.prisma.plmStage.findFirst({
      where: { id: stageId, pipelineVersionId: versionId },
    });
    if (!stage) throw new HttpException({ error: 'STAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Validate avatar exists
    const avatar = await this.prisma.participantAvatar.findFirst({
      where: { id: dto.avatarId, tenantId },
    });
    if (!avatar) throw new HttpException({ error: 'AVATAR_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check if avatar rule already exists for this stage
    const existing = await this.prisma.plmStageAvatarRule.findFirst({
      where: { stageId, avatarId: dto.avatarId },
    });
    if (existing) {
      throw new HttpException({ error: 'AVATAR_RULE_EXISTS' }, HttpStatus.BAD_REQUEST);
    }

    // Get next rule order
    const maxOrder = await this.prisma.plmStageAvatarRule.aggregate({
      where: { stageId },
      _max: { ruleOrder: true },
    });
    const nextOrder = (maxOrder._max.ruleOrder || 0) + 1;

    return this.prisma.plmStageAvatarRule.create({
      data: {
        tenantId,
        stageId,
        avatarId: dto.avatarId,
        approvalRule: dto.approvalRule || 'ONE_MEMBER',
        ruleOrder: dto.ruleOrder ?? nextOrder,
      },
      include: {
        avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
      },
    });
  }

  @Put(':stageId/avatar-rules/:ruleId')
  @ApiOperation({ summary: 'Update avatar rule' })
  async updateAvatarRule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAvatarRuleDto,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const rule = await this.prisma.plmStageAvatarRule.findFirst({
      where: { id: ruleId, stageId, tenantId },
    });
    if (!rule) throw new HttpException({ error: 'AVATAR_RULE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmStageAvatarRule.update({
      where: { id: ruleId },
      data: {
        approvalRule: dto.approvalRule ?? rule.approvalRule,
        ruleOrder: dto.ruleOrder ?? rule.ruleOrder,
      },
      include: {
        avatar: { select: { id: true, code: true, name: true, emoji: true, color: true } },
      },
    });
  }

  @Delete(':stageId/avatar-rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove avatar rule' })
  async removeAvatarRule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('versionId') versionId: string,
    @Param('stageId') stageId: string,
    @Param('ruleId') ruleId: string,
  ) {
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { id: versionId, pipelineId, tenantId },
    });
    if (!version) throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    if (version.versionStatus !== 'DRAFT') {
      throw new HttpException({ error: 'VERSION_NOT_EDITABLE' }, HttpStatus.BAD_REQUEST);
    }

    const rule = await this.prisma.plmStageAvatarRule.findFirst({
      where: { id: ruleId, stageId, tenantId },
    });
    if (!rule) throw new HttpException({ error: 'AVATAR_RULE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmStageAvatarRule.delete({ where: { id: ruleId } });
    return rule;
  }
}

// ============================================
// CARDS CONTROLLER
// ============================================

@ApiTags('PLM - Cards')
@Controller('plm/cards')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class CardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new card' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Validate pipeline is published
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: dto.pipelineId, tenantId },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (pipeline.lifecycleStatus !== 'PUBLISHED' && pipeline.lifecycleStatus !== 'TEST') {
      throw new HttpException(
        { error: 'PIPELINE_NOT_ACTIVE', message: 'Pipeline must be published or in test mode' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get initial stage
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { pipelineId: dto.pipelineId, versionNumber: pipeline.publishedVersion! },
      include: {
        stages: { where: { isInitial: true } },
      },
    });

    if (!version || version.stages.length === 0) {
      throw new HttpException({ error: 'NO_INITIAL_STAGE' }, HttpStatus.BAD_REQUEST);
    }

    const initialStage = version.stages[0];

    // Check for duplicate if uniqueKeyValue provided
    if (dto.uniqueKeyValue) {
      const existing = await this.prisma.plmCard.findFirst({
        where: { tenantId, pipelineId: dto.pipelineId, uniqueKeyValue: dto.uniqueKeyValue },
      });
      if (existing) {
        throw new HttpException({ error: 'DUPLICATE_CARD' }, HttpStatus.BAD_REQUEST);
      }
    }

    // Create card
    const card = await this.prisma.plmCard.create({
      data: {
        tenantId,
        pipelineId: dto.pipelineId,
        pipelineVersion: pipeline.publishedVersion!,
        currentStageId: initialStage.id,
        title: dto.title,
        description: dto.description || null,
        priority: dto.priority || 'MEDIUM',
        status: 'ACTIVE',
        uniqueKeyValue: dto.uniqueKeyValue || null,
        ownerId: dto.ownerId || null,
        metadata: dto.metadata || null,
        createdBy: dto.createdBy || null,
      },
      include: {
        currentStage: true,
        pipeline: true,
      },
    });

    // Attach forms based on stage rules
    const formRules = await this.prisma.plmStageFormAttachRule.findMany({
      where: { stageId: initialStage.id },
    });

    for (const rule of formRules) {
      await this.prisma.plmCardForm.create({
        data: {
          tenantId,
          cardId: card.id,
          formDefinitionId: rule.formDefinitionId,
          externalFormId: rule.externalFormId,
          status: rule.defaultFormStatus,
          data: {},
          attachedAtStageId: initialStage.id,
        },
      });
    }

    return card;
  }

  @Get()
  @ApiOperation({ summary: 'List cards' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.currentStageId = stageId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { uniqueKeyValue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.plmCard.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          currentStage: { select: { id: true, name: true, color: true, classification: true } },
          pipeline: { select: { id: true, key: true, name: true } },
          _count: { select: { forms: true, comments: true } },
        },
      }),
      this.prisma.plmCard.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID with full details' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const card = await this.prisma.plmCard.findFirst({
      where: { id, tenantId },
      include: {
        currentStage: {
          include: {
            fromTransitions: {
              include: { toStage: { select: { id: true, name: true, color: true, wipLimit: true } } },
            },
          },
        },
        pipeline: { select: { id: true, key: true, name: true } },
        forms: {
          orderBy: { attachedAt: 'asc' },
        },
        moveHistory: {
          orderBy: { movedAt: 'desc' },
          include: {
            fromStage: { select: { id: true, name: true, color: true } },
            toStage: { select: { id: true, name: true, color: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        triggerExecutions: {
          orderBy: { executedAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Format allowed transitions
    const allowedTransitions = card.currentStage.fromTransitions.map((t) => ({
      id: t.toStage.id,
      name: t.toStage.name,
      color: t.toStage.color,
      wipLimit: t.toStage.wipLimit,
    }));

    return {
      card: {
        ...card,
        currentStage: {
          id: card.currentStage.id,
          name: card.currentStage.name,
          color: card.currentStage.color,
        },
      },
      forms: card.forms,
      history: card.moveHistory,
      comments: card.comments,
      triggerExecutions: card.triggerExecutions,
      allowedTransitions,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update card' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCard.update({
      where: { id },
      data: {
        title: dto.title ?? card.title,
        description: dto.description !== undefined ? dto.description : card.description,
        priority: dto.priority ?? card.priority,
        ownerId: dto.ownerId !== undefined ? dto.ownerId : card.ownerId,
        metadata: dto.metadata !== undefined ? dto.metadata : card.metadata,
      },
    });
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move card to another stage' })
  async move(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { toStageId: string; reason?: string; movedBy?: string; comment?: string },
  ) {
    const card = await this.prisma.plmCard.findFirst({
      where: { id, tenantId },
      include: {
        currentStage: {
          include: {
            fromTransitions: {
              include: { rules: true },
            },
          },
        },
        forms: true,
      },
    });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Validate transition is allowed
    const transition = card.currentStage.fromTransitions.find((t) => t.toStageId === dto.toStageId);
    if (!transition) {
      throw new HttpException({ error: 'TRANSITION_NOT_ALLOWED' }, HttpStatus.BAD_REQUEST);
    }

    // Check WIP limit on target stage
    const targetStage = await this.prisma.plmStage.findFirst({
      where: { id: dto.toStageId },
    });
    if (targetStage?.wipLimit) {
      const currentCount = await this.prisma.plmCard.count({
        where: { currentStageId: dto.toStageId, status: 'ACTIVE' },
      });
      if (currentCount >= targetStage.wipLimit) {
        throw new HttpException(
          { error: 'WIP_LIMIT_REACHED', message: `Stage "${targetStage.name}" has reached WIP limit of ${targetStage.wipLimit}` },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Check transition rules
    for (const rule of transition.rules) {
      if (!rule.enabled) continue;

      switch (rule.ruleType) {
        case 'FORM_REQUIRED':
          if (rule.formDefinitionId) {
            const form = card.forms.find((f) => f.formDefinitionId === rule.formDefinitionId);
            if (!form || form.status !== 'FILLED') {
              throw new HttpException(
                { error: 'FORMS_NOT_FILLED', message: 'Required form is not filled' },
                HttpStatus.BAD_REQUEST,
              );
            }
          } else {
            // All forms must be filled
            const unfilledForms = card.forms.filter((f) => f.status !== 'FILLED');
            if (unfilledForms.length > 0) {
              throw new HttpException(
                { error: 'FORMS_NOT_FILLED', message: `${unfilledForms.length} form(s) not filled` },
                HttpStatus.BAD_REQUEST,
              );
            }
          }
          break;

        case 'COMMENT_REQUIRED':
          if (!dto.comment) {
            throw new HttpException(
              { error: 'COMMENT_REQUIRED', message: 'A comment is required for this transition' },
              HttpStatus.BAD_REQUEST,
            );
          }
          break;

        case 'OWNER_ONLY':
          // Would need to verify current user = card.ownerId
          // For now, skip this check as we don't have user context
          break;
      }
    }

    // Record move history
    await this.prisma.plmCardMoveHistory.create({
      data: {
        tenantId,
        cardId: id,
        fromStageId: card.currentStageId,
        toStageId: dto.toStageId,
        reason: dto.reason || 'MANUAL',
        movedBy: dto.movedBy || null,
        comment: dto.comment || null,
      },
    });

    // Add comment if provided
    if (dto.comment && dto.movedBy) {
      await this.prisma.plmCardComment.create({
        data: {
          tenantId,
          cardId: id,
          userId: dto.movedBy,
          userName: dto.movedBy, // Would be fetched from user service
          content: dto.comment,
        },
      });
    }

    // Update card stage
    const updatedCard = await this.prisma.plmCard.update({
      where: { id },
      data: { currentStageId: dto.toStageId },
      include: {
        currentStage: { select: { id: true, name: true, color: true } },
        pipeline: { select: { id: true, key: true, name: true } },
      },
    });

    // Attach forms for new stage
    const formRules = await this.prisma.plmStageFormAttachRule.findMany({
      where: { stageId: dto.toStageId },
    });

    for (const rule of formRules) {
      // Check if form already attached
      const existingForm = card.forms.find(
        (f) => f.formDefinitionId === rule.formDefinitionId || f.externalFormId === rule.externalFormId,
      );
      if (!existingForm) {
        await this.prisma.plmCardForm.create({
          data: {
            tenantId,
            cardId: id,
            formDefinitionId: rule.formDefinitionId,
            externalFormId: rule.externalFormId,
            status: rule.defaultFormStatus,
            data: {},
            attachedAtStageId: dto.toStageId,
          },
        });
      }
    }

    // Execute triggers for CARD_MOVEMENT event
    const triggers = await this.prisma.plmStageTrigger.findMany({
      where: {
        stageId: dto.toStageId,
        eventType: 'CARD_MOVEMENT',
        enabled: true,
        OR: [
          { fromStageId: null },
          { fromStageId: card.currentStageId },
        ],
      },
      include: { conditions: true },
      orderBy: { executionOrder: 'asc' },
    });

    for (const trigger of triggers) {
      // Create trigger execution record
      await this.prisma.plmTriggerExecution.create({
        data: {
          tenantId,
          triggerId: trigger.id,
          cardId: id,
          status: 'PENDING',
          eventType: 'CARD_MOVEMENT',
          integrationName: trigger.integrationName,
          integrationKey: trigger.integrationKey,
          stageName: targetStage?.name,
        },
      });
      // Actual trigger execution would be handled by a separate worker/job
    }

    // Check if stage is final - close card
    if (targetStage?.isFinal) {
      await this.prisma.plmCard.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });
    }

    return updatedCard;
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close card' })
  async close(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCard.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive card' })
  async archive(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCard.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  // ============================================
  // CARD FORMS
  // ============================================

  @Get(':id/forms')
  @ApiOperation({ summary: 'Get card forms' })
  async getForms(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCardForm.findMany({
      where: { cardId: id },
      orderBy: { attachedAt: 'asc' },
    });
  }

  @Put(':id/forms/:formId')
  @ApiOperation({ summary: 'Update card form data' })
  async updateForm(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('formId') formId: string,
    @Body() dto: { data: any; status?: string; filledBy?: string },
  ) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const form = await this.prisma.plmCardForm.findFirst({
      where: { id: formId, cardId: id },
    });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status === 'LOCKED') {
      throw new HttpException({ error: 'FORM_LOCKED' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.plmCardForm.update({
      where: { id: formId },
      data: {
        data: dto.data,
        status: dto.status ?? form.status,
        filledAt: dto.status === 'FILLED' ? new Date() : form.filledAt,
        filledBy: dto.filledBy || form.filledBy,
      },
    });
  }

  // ============================================
  // COMMENTS
  // ============================================

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get card comments' })
  async getComments(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCardComment.findMany({
      where: { cardId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to card' })
  async addComment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { content: string; userId?: string; userName: string },
  ) {
    const card = await this.prisma.plmCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException({ error: 'CARD_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmCardComment.create({
      data: {
        tenantId,
        cardId: id,
        userId: dto.userId || null,
        userName: dto.userName,
        content: dto.content,
      },
    });
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete comment' })
  async deleteComment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    const comment = await this.prisma.plmCardComment.findFirst({
      where: { id: commentId, cardId: id, tenantId },
    });
    if (!comment) throw new HttpException({ error: 'COMMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmCardComment.delete({ where: { id: commentId } });
    return comment;
  }
}

// ============================================
// KANBAN CONTROLLER (Board View)
// ============================================

@ApiTags('PLM - Kanban')
@Controller('plm/kanban')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class KanbanController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':pipelineId')
  @ApiOperation({ summary: 'Get kanban board for a pipeline' })
  async getBoard(@Headers('x-tenant-id') tenantId: string, @Param('pipelineId') pipelineId: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: pipelineId, tenantId },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (!pipeline.publishedVersion) {
      throw new HttpException({ error: 'PIPELINE_NOT_PUBLISHED' }, HttpStatus.BAD_REQUEST);
    }

    // Get published version with stages
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { pipelineId, versionNumber: pipeline.publishedVersion },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
          include: {
            formAttachRules: true,
            triggers: { where: { enabled: true } },
            fromTransitions: {
              include: {
                toStage: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!version) {
      throw new HttpException({ error: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Get cards for each stage
    const stagesWithCards = await Promise.all(
      version.stages.map(async (stage) => {
        const cards = await this.prisma.plmCard.findMany({
          where: {
            pipelineId,
            currentStageId: stage.id,
            status: { in: ['ACTIVE'] },
          },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          include: {
            forms: { select: { id: true, status: true, formDefinitionId: true } },
            _count: { select: { comments: true } },
          },
        });

        const cardsWithCounts = cards.map((card) => ({
          ...card,
          pendingFormsCount: card.forms.filter((f) => f.status === 'TO_FILL').length,
          filledFormsCount: card.forms.filter((f) => f.status === 'FILLED').length,
          totalFormsCount: card.forms.length,
          commentsCount: card._count.comments,
        }));

        return {
          ...stage,
          allowedTransitions: stage.fromTransitions.map((t) => ({
            toStageId: t.toStage.id,
            toStageName: t.toStage.name,
          })),
          hasTriggers: stage.triggers.length > 0,
          cards: cardsWithCounts,
          cardCount: cards.length,
        };
      }),
    );

    return {
      pipeline: {
        id: pipeline.id,
        key: pipeline.key,
        name: pipeline.name,
        publishedVersion: pipeline.publishedVersion,
        lifecycleStatus: pipeline.lifecycleStatus,
        versionStatus: version.versionStatus,
      },
      stages: stagesWithCards,
    };
  }
}

// ============================================
// USER GROUPS CONTROLLER
// ============================================

@ApiTags('PLM - User Groups')
@Controller('plm/groups')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class UserGroupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user group' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    const existing = await this.prisma.plmUserGroup.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new HttpException({ error: 'GROUP_NAME_EXISTS' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.plmUserGroup.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description || null,
        createdBy: dto.createdBy || null,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List user groups' })
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
      this.prisma.plmUserGroup.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ name: 'asc' }],
        include: {
          _count: { select: { members: true, permissions: true } },
        },
      }),
      this.prisma.plmUserGroup.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const group = await this.prisma.plmUserGroup.findFirst({
      where: { id, tenantId },
      include: {
        members: { orderBy: { addedAt: 'asc' } },
        permissions: {
          include: {
            pipeline: { select: { id: true, key: true, name: true } },
          },
        },
      },
    });
    if (!group) throw new HttpException({ error: 'GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return group;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update group' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const group = await this.prisma.plmUserGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new HttpException({ error: 'GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmUserGroup.update({
      where: { id },
      data: {
        name: dto.name ?? group.name,
        description: dto.description !== undefined ? dto.description : group.description,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete group' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const group = await this.prisma.plmUserGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new HttpException({ error: 'GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmUserGroup.delete({ where: { id } });
    return group;
  }

  // ============================================
  // GROUP MEMBERS
  // ============================================

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group' })
  async addMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { userId: string; userName?: string; userEmail?: string; addedBy?: string },
  ) {
    const group = await this.prisma.plmUserGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new HttpException({ error: 'GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const existing = await this.prisma.plmGroupMember.findFirst({
      where: { groupId: id, userId: dto.userId },
    });
    if (existing) {
      throw new HttpException({ error: 'MEMBER_EXISTS' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.plmGroupMember.create({
      data: {
        tenantId,
        groupId: id,
        userId: dto.userId,
        userName: dto.userName || null,
        userEmail: dto.userEmail || null,
        addedBy: dto.addedBy || null,
      },
    });
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from group' })
  async removeMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const member = await this.prisma.plmGroupMember.findFirst({
      where: { groupId: id, userId, tenantId },
    });
    if (!member) throw new HttpException({ error: 'MEMBER_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmGroupMember.delete({ where: { id: member.id } });
    return member;
  }
}

// ============================================
// PERMISSIONS CONTROLLER
// ============================================

@ApiTags('PLM - Permissions')
@Controller('plm/pipelines/:pipelineId/permissions')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Add permission to pipeline' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Body() dto: { groupId: string; role: string; createdBy?: string },
  ) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: pipelineId, tenantId },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const group = await this.prisma.plmUserGroup.findFirst({
      where: { id: dto.groupId, tenantId },
    });
    if (!group) throw new HttpException({ error: 'GROUP_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const existing = await this.prisma.plmPipelinePermission.findFirst({
      where: { pipelineId, groupId: dto.groupId },
    });
    if (existing) {
      // Update existing permission
      return this.prisma.plmPipelinePermission.update({
        where: { id: existing.id },
        data: { role: dto.role },
        include: {
          group: { select: { id: true, name: true, description: true } },
        },
      });
    }

    return this.prisma.plmPipelinePermission.create({
      data: {
        tenantId,
        pipelineId,
        groupId: dto.groupId,
        role: dto.role,
        createdBy: dto.createdBy || null,
      },
      include: {
        group: { select: { id: true, name: true, description: true } },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List pipeline permissions' })
  async list(@Headers('x-tenant-id') tenantId: string, @Param('pipelineId') pipelineId: string) {
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: pipelineId, tenantId },
    });
    if (!pipeline) throw new HttpException({ error: 'PIPELINE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipelinePermission.findMany({
      where: { pipelineId },
      include: {
        group: { select: { id: true, name: true, description: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Put(':permissionId')
  @ApiOperation({ summary: 'Update permission role' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: { role: string },
  ) {
    const permission = await this.prisma.plmPipelinePermission.findFirst({
      where: { id: permissionId, pipelineId, tenantId },
    });
    if (!permission) throw new HttpException({ error: 'PERMISSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.plmPipelinePermission.update({
      where: { id: permissionId },
      data: { role: dto.role },
      include: {
        group: { select: { id: true, name: true, description: true } },
      },
    });
  }

  @Delete(':permissionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove permission' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('permissionId') permissionId: string,
  ) {
    const permission = await this.prisma.plmPipelinePermission.findFirst({
      where: { id: permissionId, pipelineId, tenantId },
    });
    if (!permission) throw new HttpException({ error: 'PERMISSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    await this.prisma.plmPipelinePermission.delete({ where: { id: permissionId } });
    return permission;
  }
}
