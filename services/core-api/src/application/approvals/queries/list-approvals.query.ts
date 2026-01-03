import { IQuery } from '@nestjs/cqrs';

export class ListApprovalsQuery implements IQuery {
  constructor(
    readonly tenantId: string,
    readonly orgId: string,
    readonly page: number = 0,
    readonly size: number = 10,
    readonly state?: string,
    readonly type?: string,
    readonly priority?: string,
    readonly cycleId?: string,
    readonly searchQuery?: string,
    readonly sort?: string,
  ) {}
}
