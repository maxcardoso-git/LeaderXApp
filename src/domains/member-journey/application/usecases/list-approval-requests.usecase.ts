import { Injectable, Inject } from '@nestjs/common';
import {
  APPROVAL_REQUEST_REPOSITORY,
  ApprovalRequestRepository,
  ApprovalRequestFilters,
  MemberApprovalRequest,
  PagedResult,
} from '../../domain';

@Injectable()
export class ListApprovalRequestsUseCase {
  constructor(
    @Inject(APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: ApprovalRequestRepository,
  ) {}

  async execute(filters: ApprovalRequestFilters): Promise<PagedResult<MemberApprovalRequest>> {
    return this.approvalRepository.search(filters);
  }

  async getPendingByMember(
    tenantId: string,
    memberId: string,
  ): Promise<MemberApprovalRequest[]> {
    return this.approvalRepository.findPendingByMember(tenantId, memberId);
  }
}
