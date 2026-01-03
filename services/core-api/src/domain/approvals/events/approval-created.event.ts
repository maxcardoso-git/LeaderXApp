export class ApprovalCreatedEvent {
  readonly eventType = 'approval.created';
  readonly occurredAt: Date;

  constructor(
    readonly approvalId: string,
    readonly approvalType: string,
    readonly candidateId: string,
    readonly tenantId: string,
    readonly orgId: string,
    readonly cycleId?: string,
  ) {
    this.occurredAt = new Date();
  }
}
