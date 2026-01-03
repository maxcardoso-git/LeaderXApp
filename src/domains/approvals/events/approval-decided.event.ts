import { DomainEvent } from '../../../common/eventing/domain-event.interface';

export const APPROVAL_DECIDED_EVENT = 'approval.decided';

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalDecidedPayload extends Record<string, unknown> {
  approvalId: string;
  decision: ApprovalDecision;
  approvalType: string;
  candidateId?: string;
  candidateName?: string;
  decidedBy: string;
  reason?: string;
  tenantId: string;
  orgId: string;
  cycleId?: string;
  correlationId?: string;
  occurredAt: string;
}

export class ApprovalDecidedEvent implements DomainEvent {
  readonly eventType = APPROVAL_DECIDED_EVENT;
  readonly aggregateType = 'Approval';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly decision: ApprovalDecision,
    public readonly approvalType: string,
    public readonly decidedBy: string,
    public readonly tenantId: string,
    public readonly orgId: string,
    public readonly correlationId?: string,
    public readonly cycleId?: string,
    public readonly reason?: string,
    public readonly candidateId?: string,
    public readonly candidateName?: string,
  ) {
    this.occurredAt = new Date();
  }

  toPayload(): ApprovalDecidedPayload {
    return {
      approvalId: this.aggregateId,
      decision: this.decision,
      approvalType: this.approvalType,
      candidateId: this.candidateId,
      candidateName: this.candidateName,
      decidedBy: this.decidedBy,
      reason: this.reason,
      tenantId: this.tenantId,
      orgId: this.orgId,
      cycleId: this.cycleId,
      correlationId: this.correlationId,
      occurredAt: this.occurredAt.toISOString(),
    };
  }
}
