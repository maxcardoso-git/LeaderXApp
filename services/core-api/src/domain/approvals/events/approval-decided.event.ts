import { Decision } from '../entities/approval.entity';

export class ApprovalDecidedEvent {
  readonly eventType = 'approval.decided';
  readonly occurredAt: Date;

  constructor(
    readonly approvalId: string,
    readonly decision: Decision,
    readonly approvalType: string,
    readonly candidateId: string,
    readonly decidedBy: string,
    readonly tenantId: string,
    readonly orgId: string,
    readonly cycleId?: string,
    readonly reason?: string,
  ) {
    this.occurredAt = new Date();
  }
}
