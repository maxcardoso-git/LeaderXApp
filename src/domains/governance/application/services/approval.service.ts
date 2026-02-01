import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface CreateApprovalRequestInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  title: string;
  description?: string;
  context?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  requestedBy?: string;
  policyId?: string;
}

export interface ApprovalRequestResult {
  request: {
    id: string;
    requestKey: string;
    status: string;
    policyId: string;
    pipelineId: string;
    cardId: string | null;
    blocking: boolean;
  };
  card: {
    id: string;
    title: string;
    currentStageId: string;
  } | null;
  policy: {
    id: string;
    name: string;
    blocking: boolean;
  };
  requiresApproval: boolean;
}

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find matching approval policy for a given entity type and action
   */
  async findMatchingPolicy(
    tenantId: string,
    entityType: string,
    action: string,
  ) {
    const policies = await this.prisma.govApprovalPolicy.findMany({
      where: {
        entityType,
        action,
        enabled: true,
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { priority: 'asc' },
    });

    return policies[0] || null;
  }

  /**
   * Create approval request with PLM card
   */
  async createApprovalRequest(
    input: CreateApprovalRequestInput,
  ): Promise<ApprovalRequestResult> {
    const { tenantId, entityType, entityId, action, title, description, context, snapshot, requestedBy, policyId } = input;

    // Find matching policy
    let policy = null;
    if (policyId) {
      policy = await this.prisma.govApprovalPolicy.findFirst({
        where: { id: policyId },
      });
      if (!policy) {
        throw new HttpException({ error: 'POLICY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
    } else {
      policy = await this.findMatchingPolicy(tenantId, entityType, action);
    }

    if (!policy) {
      throw new HttpException(
        { error: 'NO_MATCHING_POLICY', message: 'No approval policy matches this entity and action' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate unique request key
    const requestKey = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create approval request
    const request = await this.prisma.govApprovalRequest.create({
      data: {
        tenantId,
        requestKey,
        policyId: policy.id,
        pipelineId: policy.pipelineId,
        pipelineVersion: policy.pipelineVersion,
        entityType,
        entityId,
        action,
        status: 'PENDING',
        blocking: policy.blocking,
        requestedBy: requestedBy || null,
        context: (context || {}) as Prisma.InputJsonValue,
        snapshot: (snapshot || {}) as Prisma.InputJsonValue,
      },
    });

    // Create initial history entry
    await this.prisma.govApprovalHistory.create({
      data: {
        tenantId,
        requestId: request.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: requestedBy || null,
      },
    });

    // Create PLM card for this request
    const card = await this.createApprovalCard(tenantId, policy.pipelineId, {
      title,
      description,
      requestId: request.id,
      entityType,
      entityId,
      action,
      requestedBy,
    });

    // Update request with cardId
    if (card) {
      await this.prisma.govApprovalRequest.update({
        where: { id: request.id },
        data: { cardId: card.id },
      });
    }

    return {
      request: {
        id: request.id,
        requestKey: request.requestKey,
        status: request.status,
        policyId: request.policyId || policy.id,
        pipelineId: request.pipelineId,
        cardId: card?.id || null,
        blocking: request.blocking,
      },
      card: card ? {
        id: card.id,
        title: card.title,
        currentStageId: card.currentStageId,
      } : null,
      policy: {
        id: policy.id,
        name: policy.name,
        blocking: policy.blocking,
      },
      requiresApproval: policy.blocking,
    };
  }

  /**
   * Create a PLM card for an approval request
   */
  private async createApprovalCard(
    tenantId: string,
    pipelineId: string,
    data: {
      title: string;
      description?: string;
      requestId: string;
      entityType: string;
      entityId: string;
      action: string;
      requestedBy?: string;
    },
  ) {
    // Validate pipeline exists and is active
    const pipeline = await this.prisma.plmPipeline.findFirst({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found for approval request`);
      return null;
    }

    if (pipeline.lifecycleStatus !== 'PUBLISHED' && pipeline.lifecycleStatus !== 'TEST') {
      console.error(`Pipeline ${pipelineId} is not active (status: ${pipeline.lifecycleStatus})`);
      return null;
    }

    // Get initial stage from published version
    const version = await this.prisma.plmPipelineVersion.findFirst({
      where: { pipelineId, versionNumber: pipeline.publishedVersion! },
      include: {
        stages: { where: { isInitial: true } },
      },
    });

    if (!version || version.stages.length === 0) {
      console.error(`No initial stage found for pipeline ${pipelineId}`);
      return null;
    }

    const initialStage = version.stages[0];

    // Create unique key to prevent duplicate cards
    const uniqueKeyValue = `approval_${data.entityType}_${data.entityId}_${data.action}_${data.requestId}`;

    // Check for existing card
    const existingCard = await this.prisma.plmCard.findFirst({
      where: { tenantId, pipelineId, uniqueKeyValue },
    });

    if (existingCard) {
      console.warn(`Card already exists for approval request ${data.requestId}`);
      return existingCard;
    }

    // Create card
    const card = await this.prisma.plmCard.create({
      data: {
        tenantId,
        pipelineId,
        pipelineVersion: pipeline.publishedVersion!,
        currentStageId: initialStage.id,
        title: data.title,
        description: data.description || `Solicitação de aprovação: ${data.action} ${data.entityType}`,
        priority: 'MEDIUM',
        status: 'ACTIVE',
        uniqueKeyValue,
        ownerId: data.requestedBy || null,
        metadata: {
          approvalRequestId: data.requestId,
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          source: 'APPROVAL_ENGINE',
        },
        createdBy: data.requestedBy || 'system',
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

  /**
   * Check if an entity requires approval for an action
   * Returns the policy if approval is required, null otherwise
   */
  async checkRequiresApproval(
    tenantId: string,
    entityType: string,
    action: string,
  ): Promise<{ requiresApproval: boolean; policy: any | null }> {
    const policy = await this.findMatchingPolicy(tenantId, entityType, action);

    if (!policy) {
      return { requiresApproval: false, policy: null };
    }

    return {
      requiresApproval: policy.blocking,
      policy,
    };
  }

  /**
   * Update request status based on card stage
   */
  async syncRequestWithCardStage(cardId: string): Promise<void> {
    // Find the card
    const card = await this.prisma.plmCard.findFirst({
      where: { id: cardId },
      include: { currentStage: true },
    });

    if (!card) return;

    // Find approval request linked to this card
    const request = await this.prisma.govApprovalRequest.findFirst({
      where: { cardId },
    });

    if (!request) return;

    // Check if stage is final (approved) or rejection
    const stage = card.currentStage;
    const isApproved = stage?.isFinal === true;
    const isRejected = stage?.name?.toLowerCase().includes('rejeit') ||
                       stage?.name?.toLowerCase().includes('reject') ||
                       stage?.classification === 'CANCELED';

    let newStatus = request.status;
    if (isApproved && !isRejected) {
      newStatus = 'APPROVED';
    } else if (isRejected) {
      newStatus = 'REJECTED';
    } else if (card.status === 'CLOSED' && !isApproved) {
      newStatus = 'REJECTED';
    } else {
      newStatus = 'IN_PROGRESS';
    }

    if (newStatus !== request.status) {
      await this.prisma.govApprovalRequest.update({
        where: { id: request.id },
        data: {
          status: newStatus,
          currentStageKey: stage?.id || null,
          resolvedAt: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? new Date() : null,
        },
      });

      // Create history entry
      await this.prisma.govApprovalHistory.create({
        data: {
          tenantId: request.tenantId,
          requestId: request.id,
          fromStatus: request.status,
          toStatus: newStatus,
          changedBy: 'system',
          comment: `Status atualizado automaticamente baseado no estágio: ${stage?.name}`,
        },
      });
    }
  }
}
