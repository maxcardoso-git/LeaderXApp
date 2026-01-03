import { ICommand } from '@nestjs/cqrs';

export class CreateApprovalCommand implements ICommand {
  constructor(
    readonly type: string,
    readonly candidateId: string,
    readonly priority: string,
    readonly tenantId: string,
    readonly orgId: string,
    readonly candidateName?: string,
    readonly cycleId?: string,
    readonly metadata?: Record<string, unknown>,
  ) {}
}
