import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetApprovalQuery } from '../queries';
import {
  ApprovalId,
  APPROVAL_REPOSITORY,
  ApprovalRepositoryPort,
} from '@domain/approvals';

export interface ApprovalDetailResult {
  id: string;
  type: string;
  state: string;
  candidateId: string;
  candidateName?: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  decisionReason?: string;
  metadata?: Record<string, unknown>;
}

@QueryHandler(GetApprovalQuery)
export class GetApprovalHandler
  implements IQueryHandler<GetApprovalQuery, ApprovalDetailResult>
{
  constructor(
    @Inject(APPROVAL_REPOSITORY)
    private readonly approvalRepository: ApprovalRepositoryPort,
  ) {}

  async execute(query: GetApprovalQuery): Promise<ApprovalDetailResult> {
    const approvalId = ApprovalId.fromString(query.approvalId);

    const approval = await this.approvalRepository.findById(
      approvalId,
      query.tenantId,
    );

    if (!approval) {
      throw new NotFoundException(`Approval ${query.approvalId} not found`);
    }

    return {
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
    };
  }
}
