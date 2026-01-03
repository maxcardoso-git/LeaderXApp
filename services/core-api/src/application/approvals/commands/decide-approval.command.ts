import { ICommand } from '@nestjs/cqrs';
import { Decision } from '@domain/approvals';

export class DecideApprovalCommand implements ICommand {
  constructor(
    readonly approvalId: string,
    readonly decision: Decision,
    readonly decidedBy: string,
    readonly tenantId: string,
    readonly orgId: string,
    readonly reason?: string,
  ) {}
}
