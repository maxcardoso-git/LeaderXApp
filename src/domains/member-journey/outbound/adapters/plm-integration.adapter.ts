import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { PlmIntegrationPort, PlmCardCreationInput } from '../../domain';

@Injectable()
export class PlmIntegrationAdapter implements PlmIntegrationPort {
  private readonly logger = new Logger(PlmIntegrationAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCard(input: PlmCardCreationInput): Promise<{ cardId: string }> {
    // Find the pipeline and its initial stage
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: {
        id: input.pipelineId,
        tenantId: input.tenantId,
        lifecycleStatus: { in: ['PUBLISHED', 'TEST'] },
      },
    });

    if (!pipeline || !pipeline.publishedVersion) {
      throw new Error(`Pipeline ${input.pipelineId} not found or not published`);
    }

    // Get the published version with initial stage
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: {
        pipelineId: input.pipelineId,
        tenantId: input.tenantId,
        versionNumber: pipeline.publishedVersion,
      },
      include: {
        stages: {
          where: { isInitial: true },
          take: 1,
        },
      },
    });

    if (!version || version.stages.length === 0) {
      throw new Error(`Pipeline ${input.pipelineId} has no initial stage`);
    }

    const initialStage = version.stages[0];

    // Create the PLM card
    const card = await this.prisma.plmCard.create({
      data: {
        tenantId: input.tenantId,
        pipelineId: input.pipelineId,
        pipelineVersion: pipeline.publishedVersion,
        currentStageId: initialStage.id,
        title: input.title,
        description: input.description,
        priority: input.priority || 'MEDIUM',
        status: 'ACTIVE',
        metadata: input.metadata as any,
      },
    });

    this.logger.log(
      `Created PLM card ${card.id} in pipeline ${input.pipelineId} at stage ${initialStage.name}`,
    );

    // Record initial move history
    await this.prisma.plmCardMoveHistory.create({
      data: {
        tenantId: input.tenantId,
        cardId: card.id,
        fromStageId: initialStage.id,
        toStageId: initialStage.id,
        reason: 'API',
        movedBy: 'SYSTEM',
        comment: 'Card created from Member Journey approval request',
      },
    });

    return { cardId: card.id };
  }
}
