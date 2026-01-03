import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListApprovalsQuery } from '../queries';
import {
  APPROVAL_REPOSITORY,
  ApprovalRepositoryPort,
  PaginatedResult,
} from '@domain/approvals';
import { ApprovalDetailResult } from './get-approval.handler';

export type PaginatedApprovalsResult = PaginatedResult<ApprovalDetailResult>;

@QueryHandler(ListApprovalsQuery)
export class ListApprovalsHandler
  implements IQueryHandler<ListApprovalsQuery, PaginatedApprovalsResult>
{
  constructor(
    @Inject(APPROVAL_REPOSITORY)
    private readonly approvalRepository: ApprovalRepositoryPort,
  ) {}

  async execute(query: ListApprovalsQuery): Promise<PaginatedApprovalsResult> {
    const result = await this.approvalRepository.findMany(
      {
        tenantId: query.tenantId,
        orgId: query.orgId,
        cycleId: query.cycleId,
        state: query.state,
        type: query.type,
        priority: query.priority,
        searchQuery: query.searchQuery,
      },
      {
        page: query.page,
        size: query.size,
        sort: query.sort,
      },
    );

    return {
      items: result.items.map((approval) => ({
        id: approval.id.toString(),
        type: approval.type,
        state: approval.state.toString(),
        candidateId: approval.candidateId,
        candidateName: approval.candidateName,
        priority: approval.priority.toString(),
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        decidedAt: approval.decidedAt,
        decidedBy: approval.decidedBy,
        decisionReason: approval.decisionReason,
        metadata: approval.metadata,
      })),
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    };
  }
}
