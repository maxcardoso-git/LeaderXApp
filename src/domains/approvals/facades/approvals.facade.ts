import { Injectable, Logger } from '@nestjs/common';
import { ApprovalsService, ListApprovalsParams } from '../services/approvals.service';
import { IdempotencyService } from '../../../common/idempotency/idempotency.service';
import { InMemoryEventBus } from '../../../common/eventing/in-memory-event-bus';
import { OutboxPublisher } from '../../../common/outbox/outbox.publisher';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { MissingIdempotencyKeyException } from '../../../common/errors/domain-exceptions';
import {
  ApprovalDecidedEvent,
  APPROVAL_DECIDED_EVENT,
  ApprovalDecision,
} from '../events/approval-decided.event';

export interface DecideApprovalInput {
  approvalId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
  idempotencyKey?: string;
}

export interface BulkDecideInput {
  approvalIds: string[];
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
  idempotencyKey?: string;
}

@Injectable()
export class ApprovalsFacade {
  private readonly logger = new Logger(ApprovalsFacade.name);

  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventBus: InMemoryEventBus,
    private readonly outboxPublisher: OutboxPublisher,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * List approvals with filters (no idempotency needed for reads)
   */
  async list(params: ListApprovalsParams = {}) {
    return this.approvalsService.list(params);
  }

  /**
   * Get approval by ID (no idempotency needed for reads)
   */
  async getById(approvalId: string) {
    return this.approvalsService.getById(approvalId);
  }

  /**
   * Decide an approval with idempotency protection
   */
  async decide(input: DecideApprovalInput) {
    const ctx = this.contextService.getContext();

    // Require idempotency key for mutations
    if (!input.idempotencyKey) {
      throw new MissingIdempotencyKeyException();
    }

    // Use idempotency service to handle duplicates
    const result = await this.idempotencyService.run(
      {
        scope: 'approvals.decide',
        key: input.idempotencyKey,
        tenantId: ctx.tenantId,
      },
      {
        approvalId: input.approvalId,
        decision: input.decision,
        reason: input.reason,
      },
      async () => {
        // Execute the actual decision
        const response = await this.approvalsService.decide({
          approvalId: input.approvalId,
          decision: input.decision,
          reason: input.reason,
        });

        // Create and publish event
        await this.publishDecisionEvent(input, ctx);

        return response;
      },
    );

    if (!result.isNew) {
      this.logger.debug(
        `Returning cached response for idempotency key: ${input.idempotencyKey}`,
      );
    }

    return result.response;
  }

  /**
   * Bulk decide approvals with idempotency protection
   */
  async decideBulk(input: BulkDecideInput) {
    const ctx = this.contextService.getContext();

    // Require idempotency key for mutations
    if (!input.idempotencyKey) {
      throw new MissingIdempotencyKeyException();
    }

    // Use idempotency service to handle duplicates
    const result = await this.idempotencyService.run(
      {
        scope: 'approvals.bulkDecide',
        key: input.idempotencyKey,
        tenantId: ctx.tenantId,
      },
      {
        approvalIds: input.approvalIds,
        decision: input.decision,
        reason: input.reason,
      },
      async () => {
        // Execute the actual bulk decision
        const response = await this.approvalsService.decideBulk({
          approvalIds: input.approvalIds,
          decision: input.decision,
          reason: input.reason,
        });

        // Publish events for each successful decision
        // Note: In a real implementation, we'd parse the response to see which succeeded
        for (const approvalId of input.approvalIds) {
          await this.publishDecisionEvent(
            {
              approvalId,
              decision: input.decision,
              reason: input.reason,
            },
            ctx,
          );
        }

        return response;
      },
    );

    if (!result.isNew) {
      this.logger.debug(
        `Returning cached response for bulk idempotency key: ${input.idempotencyKey}`,
      );
    }

    return result.response;
  }

  /**
   * Publish decision event to both outbox (reliable) and event bus (immediate)
   */
  private async publishDecisionEvent(
    input: { approvalId: string; decision: string; reason?: string },
    ctx: { tenantId: string; orgId: string; cycleId?: string; correlationId: string; actorId?: string },
  ): Promise<void> {
    const decision = this.mapDecision(input.decision);

    const event = new ApprovalDecidedEvent(
      input.approvalId,
      decision,
      'UNKNOWN', // Would come from API response in real implementation
      ctx.actorId || 'system',
      ctx.tenantId,
      ctx.orgId,
      ctx.correlationId,
      ctx.cycleId,
      input.reason,
    );

    // 1. Enqueue to outbox for guaranteed delivery
    await this.outboxPublisher.enqueue(event);

    // 2. Publish immediately for best-effort instant processing
    // This is fire-and-forget - handlers are also triggered by outbox worker
    this.eventBus.publish(event).catch((error) => {
      this.logger.warn(
        `Immediate event publish failed (will be processed by outbox): ${error.message}`,
      );
    });
  }

  /**
   * Map decision string to ApprovalDecision type
   */
  private mapDecision(decision: string): ApprovalDecision {
    switch (decision) {
      case 'APPROVE':
        return 'APPROVED';
      case 'REJECT':
        return 'REJECTED';
      case 'REQUEST_CHANGES':
        return 'CHANGES_REQUESTED';
      default:
        return 'REJECTED';
    }
  }
}
