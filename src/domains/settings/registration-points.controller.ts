import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Default registration blocks
const DEFAULT_BLOCKS = [
  { blockKey: 'address', blockName: 'Endereço', points: 80, sortOrder: 1 },
  { blockKey: 'dietary_restrictions', blockName: 'Restrições Alimentares', points: 40, sortOrder: 2 },
  { blockKey: 'personal_data', blockName: 'Dados Pessoais', points: 150, sortOrder: 3 },
  { blockKey: 'interests_motivation', blockName: 'Interesses e Motivação', points: 80, sortOrder: 4 },
  { blockKey: 'professional_info', blockName: 'Informações Profissionais', points: 120, sortOrder: 5 },
  { blockKey: 'photo', blockName: 'Foto de Perfil', points: 30, sortOrder: 6 },
];

// ============================================
// REGISTRATION BLOCK POINTS CONTROLLER
// ============================================

@ApiTags('Settings - Registration Points')
@Controller('settings/registration-points')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class RegistrationPointsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all registration block points with bonus settings' })
  async getAll(@Headers('x-tenant-id') tenantId: string) {
    // Get or create bonus settings
    let bonusSettings = await this.prisma.registrationBonusSettings.findUnique({
      where: { tenantId },
    });

    if (!bonusSettings) {
      bonusSettings = await this.prisma.registrationBonusSettings.create({
        data: {
          tenantId,
          bonusPoints: 500,
          targetTotal: 500,
        },
      });
    }

    // Get existing blocks
    let blocks = await this.prisma.registrationBlockPoints.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });

    // If no blocks exist, create defaults
    if (blocks.length === 0) {
      await this.prisma.registrationBlockPoints.createMany({
        data: DEFAULT_BLOCKS.map((block) => ({
          tenantId,
          ...block,
          active: true,
        })),
      });

      blocks = await this.prisma.registrationBlockPoints.findMany({
        where: { tenantId },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // Calculate total points
    const totalPoints = blocks
      .filter((b) => b.active)
      .reduce((sum, b) => sum + b.points, 0);

    return {
      blocks,
      bonusSettings,
      totalPoints,
      targetTotal: bonusSettings.targetTotal,
    };
  }

  @Put('block/:id')
  @ApiOperation({ summary: 'Update a registration block points' })
  async updateBlock(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { points?: number; active?: boolean; blockName?: string },
  ) {
    const existing = await this.prisma.registrationBlockPoints.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException({ error: 'BLOCK_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.registrationBlockPoints.update({
      where: { id },
      data: {
        points: dto.points ?? existing.points,
        active: dto.active ?? existing.active,
        blockName: dto.blockName ?? existing.blockName,
      },
    });
  }

  @Put('bonus')
  @ApiOperation({ summary: 'Update bonus settings' })
  async updateBonus(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { bonusPoints?: number; targetTotal?: number },
  ) {
    return this.prisma.registrationBonusSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        bonusPoints: dto.bonusPoints ?? 500,
        targetTotal: dto.targetTotal ?? 500,
      },
      update: {
        bonusPoints: dto.bonusPoints,
        targetTotal: dto.targetTotal,
      },
    });
  }

  @Post('block')
  @ApiOperation({ summary: 'Add a new registration block' })
  async addBlock(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { blockKey: string; blockName: string; points: number },
  ) {
    // Check if block key already exists
    const existing = await this.prisma.registrationBlockPoints.findUnique({
      where: { tenantId_blockKey: { tenantId, blockKey: dto.blockKey } },
    });

    if (existing) {
      throw new HttpException({ error: 'BLOCK_KEY_EXISTS' }, HttpStatus.CONFLICT);
    }

    // Get max sort order
    const maxOrder = await this.prisma.registrationBlockPoints.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });

    return this.prisma.registrationBlockPoints.create({
      data: {
        tenantId,
        blockKey: dto.blockKey,
        blockName: dto.blockName,
        points: dto.points,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        active: true,
      },
    });
  }

  @Delete('block/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a registration block' })
  async deleteBlock(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const existing = await this.prisma.registrationBlockPoints.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new HttpException({ error: 'BLOCK_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    await this.prisma.registrationBlockPoints.delete({ where: { id } });
    return existing;
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder registration blocks' })
  async reorder(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { blockIds: string[] },
  ) {
    // Update sort order for each block
    await Promise.all(
      dto.blockIds.map((blockId, index) =>
        this.prisma.registrationBlockPoints.updateMany({
          where: { id: blockId, tenantId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return this.prisma.registrationBlockPoints.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset to default blocks' })
  async reset(@Headers('x-tenant-id') tenantId: string) {
    // Delete all existing blocks
    await this.prisma.registrationBlockPoints.deleteMany({
      where: { tenantId },
    });

    // Reset bonus settings
    await this.prisma.registrationBonusSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        bonusPoints: 500,
        targetTotal: 500,
      },
      update: {
        bonusPoints: 500,
        targetTotal: 500,
      },
    });

    // Create default blocks
    await this.prisma.registrationBlockPoints.createMany({
      data: DEFAULT_BLOCKS.map((block) => ({
        tenantId,
        ...block,
        active: true,
      })),
    });

    return this.getAll(tenantId);
  }
}
