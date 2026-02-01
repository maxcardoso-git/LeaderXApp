import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';

const BATCH_SIZE = 50;

interface ApprovalActionHandler {
  entityType: string;
  action: string;
  onApprove: (tenantId: string, entityId: string, request: any) => Promise<void>;
  onReject: (tenantId: string, entityId: string, request: any) => Promise<void>;
}

@Injectable()
export class ApprovalWorkerJob {
  private readonly logger = new Logger(ApprovalWorkerJob.name);
  private isRunning = false;

  private readonly handlers: ApprovalActionHandler[] = [
    {
      entityType: 'EVENT',
      action: 'PUBLISH',
      onApprove: this.handleEventPublishApproved.bind(this),
      onReject: this.handleEventPublishRejected.bind(this),
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    if (this.isRunning) {
      this.logger.debug('Approval worker already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      await this.processApprovalRequests();
    } finally {
      this.isRunning = false;
    }
  }

  async run(): Promise<number> {
    return this.processApprovalRequests();
  }

  private async processApprovalRequests(): Promise<number> {
    this.logger.debug('Starting approval worker job');

    let totalProcessed = 0;

    // Step 1: Sync card stages with request status
    await this.syncCardStagesWithRequests();

    // Step 2: Find approved requests that need action execution
    const approvedRequests = await this.prisma.govApprovalRequest.findMany({
      where: {
        status: 'APPROVED',
        actionExecuted: false,
      },
      take: BATCH_SIZE,
    });

    for (const request of approvedRequests) {
      try {
        await this.executeApprovedAction(request);
        totalProcessed++;
      } catch (error) {
        this.logger.error(
          `Failed to execute approved action for request ${request.id}: ${error}`,
        );
      }
    }

    // Step 3: Find rejected requests that need action execution
    const rejectedRequests = await this.prisma.govApprovalRequest.findMany({
      where: {
        status: 'REJECTED',
        actionExecuted: false,
      },
      take: BATCH_SIZE,
    });

    for (const request of rejectedRequests) {
      try {
        await this.executeRejectedAction(request);
        totalProcessed++;
      } catch (error) {
        this.logger.error(
          `Failed to execute rejected action for request ${request.id}: ${error}`,
        );
      }
    }

    if (totalProcessed > 0) {
      this.logger.log(`Processed ${totalProcessed} approval requests`);
    } else {
      this.logger.debug('No pending approval requests to process');
    }

    return totalProcessed;
  }

  private async syncCardStagesWithRequests(): Promise<void> {
    // Find pending requests with cards
    const pendingRequests = await this.prisma.govApprovalRequest.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        cardId: { not: null },
      },
      take: BATCH_SIZE,
    });

    for (const request of pendingRequests) {
      if (!request.cardId) continue;

      try {
        const card = await this.prisma.plmCard.findFirst({
          where: { id: request.cardId },
          include: { currentStage: true },
        });

        if (!card) continue;

        const stage = card.currentStage;

        // Use explicit approvalOutcome field (preferred)
        // Fallback to legacy logic for backwards compatibility
        let newStatus = request.status;

        if (stage?.approvalOutcome) {
          // New explicit approach: use approvalOutcome field
          switch (stage.approvalOutcome) {
            case 'APPROVE':
              newStatus = 'APPROVED';
              break;
            case 'REJECT':
            case 'CANCEL':
              newStatus = 'REJECTED';
              break;
          }
        } else {
          // Legacy fallback: detect by stage properties
          const isApproved = stage?.isFinal === true;
          const isRejected =
            stage?.name?.toLowerCase().includes('rejeit') ||
            stage?.name?.toLowerCase().includes('reject') ||
            stage?.classification === 'CANCELED';

          if (isApproved && !isRejected) {
            newStatus = 'APPROVED';
          } else if (isRejected) {
            newStatus = 'REJECTED';
          } else if (card.status === 'CLOSED' && !isApproved) {
            newStatus = 'REJECTED';
          }
        }

        // If still pending and card exists, mark as in progress
        if (newStatus === request.status && request.status === 'PENDING') {
          newStatus = 'IN_PROGRESS';
        }

        if (newStatus !== request.status) {
          await this.prisma.govApprovalRequest.update({
            where: { id: request.id },
            data: {
              status: newStatus,
              currentStageKey: stage?.id || null,
              resolvedAt:
                newStatus === 'APPROVED' || newStatus === 'REJECTED'
                  ? new Date()
                  : null,
            },
          });

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

          this.logger.debug(
            `Updated request ${request.id} status from ${request.status} to ${newStatus}`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to sync request ${request.id}: ${error}`);
      }
    }
  }

  private async executeApprovedAction(request: any): Promise<void> {
    const handler = this.handlers.find(
      (h) => h.entityType === request.entityType && h.action === request.action,
    );

    if (handler) {
      await handler.onApprove(request.tenantId, request.entityId, request);
    } else {
      this.logger.warn(
        `No handler found for ${request.entityType}/${request.action}`,
      );
    }

    // Mark as executed
    await this.prisma.govApprovalRequest.update({
      where: { id: request.id },
      data: { actionExecuted: true, actionExecutedAt: new Date() },
    });
  }

  private async executeRejectedAction(request: any): Promise<void> {
    const handler = this.handlers.find(
      (h) => h.entityType === request.entityType && h.action === request.action,
    );

    if (handler) {
      await handler.onReject(request.tenantId, request.entityId, request);
    } else {
      this.logger.warn(
        `No handler found for ${request.entityType}/${request.action}`,
      );
    }

    // Mark as executed
    await this.prisma.govApprovalRequest.update({
      where: { id: request.id },
      data: { actionExecuted: true, actionExecutedAt: new Date() },
    });
  }

  // ===== ACTION HANDLERS =====

  private async handleEventPublishApproved(
    tenantId: string,
    eventId: string,
    request: any,
  ): Promise<void> {
    this.logger.log(`Publishing event ${eventId} after approval`);

    // Find the event
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      this.logger.error(`Event ${eventId} not found`);
      return;
    }

    if (event.status === 'PUBLISHED') {
      this.logger.debug(`Event ${eventId} already published`);
      return;
    }

    // Publish the event
    const currentMetadata = (event.metadata as object) || {};
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
        metadata: {
          ...currentMetadata,
          publishedAt: new Date().toISOString(),
          approvalRequestId: undefined,
          pendingApproval: undefined,
        },
      },
    });

    // Create outbox event
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'EVENT',
        aggregateId: eventId,
        eventType: 'event.published',
        payload: {
          eventId,
          publishedAt: new Date().toISOString(),
          approvalRequestId: request.id,
        } as Prisma.InputJsonValue,
        metadata: {
          actorId: 'approval-worker',
          source: 'APPROVAL_ENGINE',
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Event ${eventId} published successfully`);
  }

  private async handleEventPublishRejected(
    tenantId: string,
    eventId: string,
    request: any,
  ): Promise<void> {
    this.logger.log(`Reverting event ${eventId} to DRAFT after rejection`);

    // Find the event
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      this.logger.error(`Event ${eventId} not found`);
      return;
    }

    // Revert to draft
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'DRAFT',
        metadata: {
          ...(event.metadata as object),
          approvalRequestId: undefined,
          pendingApproval: undefined,
          rejectedApprovalId: request.id,
          rejectedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Event ${eventId} reverted to DRAFT`);
  }
}
