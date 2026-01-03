import { IQuery } from '@nestjs/cqrs';

export class GetApprovalQuery implements IQuery {
  constructor(
    readonly approvalId: string,
    readonly tenantId: string,
  ) {}
}
