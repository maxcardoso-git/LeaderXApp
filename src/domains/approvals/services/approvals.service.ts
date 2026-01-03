import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ApprovalsService as ApprovalsApiClient } from '../../../../services/admin-bff/api/approvals.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import {
  ApprovalNotFoundException,
  UpstreamServiceException,
} from '../../../common/errors/domain-exceptions';

// Re-export types from OpenAPI client for convenience
export { ApprovalDecisionRequest } from '../../../../services/admin-bff/model/approvalDecisionRequest';
export { ApprovalDecisionResponse } from '../../../../services/admin-bff/model/approvalDecisionResponse';
export { ApprovalDetailResponse } from '../../../../services/admin-bff/model/approvalDetailResponse';
export { PagedApprovalsResponse } from '../../../../services/admin-bff/model/pagedApprovalsResponse';
export { BulkApprovalDecisionRequest } from '../../../../services/admin-bff/model/bulkApprovalDecisionRequest';
export { BulkApprovalDecisionResponse } from '../../../../services/admin-bff/model/bulkApprovalDecisionResponse';
export { ApprovalState } from '../../../../services/admin-bff/model/approvalState';

export interface ListApprovalsParams {
  state?: string;
  type?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface DecideApprovalParams {
  approvalId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
}

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly apiClient: ApprovalsApiClient,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * List approvals with filters and pagination
   */
  async list(params: ListApprovalsParams = {}) {
    const ctx = this.contextService.getContext();

    this.logger.debug(`Listing approvals`, { tenantId: ctx.tenantId, params });

    try {
      const response = await firstValueFrom(
        this.apiClient.listApprovals({
          xTenantId: ctx.tenantId,
          xOrgId: ctx.orgId,
          xCycleId: ctx.cycleId,
          xRequestId: ctx.requestId,
          acceptLanguage: ctx.acceptLanguage,
          state: params.state as any,
          type: params.type,
          priority: params.priority,
          q: params.q,
          page: params.page,
          size: params.size,
          sort: params.sort,
        }),
      );

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'listApprovals');
    }
  }

  /**
   * Get approval details by ID
   */
  async getById(approvalId: string) {
    const ctx = this.contextService.getContext();

    this.logger.debug(`Getting approval ${approvalId}`);

    try {
      const response = await firstValueFrom(
        this.apiClient.getApproval({
          xTenantId: ctx.tenantId,
          xOrgId: ctx.orgId,
          xCycleId: ctx.cycleId,
          xRequestId: ctx.requestId,
          acceptLanguage: ctx.acceptLanguage,
          approvalId,
        }),
      );

      return response.data;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new ApprovalNotFoundException(approvalId);
      }
      this.handleApiError(error, 'getApproval');
    }
  }

  /**
   * Submit a decision for an approval
   */
  async decide(params: DecideApprovalParams) {
    const ctx = this.contextService.getContext();

    this.logger.debug(`Deciding approval ${params.approvalId}`, {
      decision: params.decision,
    });

    try {
      const response = await firstValueFrom(
        this.apiClient.decideApproval({
          xTenantId: ctx.tenantId,
          xOrgId: ctx.orgId,
          xCycleId: ctx.cycleId,
          xRequestId: ctx.requestId,
          acceptLanguage: ctx.acceptLanguage,
          approvalId: params.approvalId,
          approvalDecisionRequest: {
            decision: params.decision,
            reason: params.reason,
          },
        }),
      );

      return response.data;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new ApprovalNotFoundException(params.approvalId);
      }
      this.handleApiError(error, 'decideApproval');
    }
  }

  /**
   * Submit bulk decisions for multiple approvals
   */
  async decideBulk(params: {
    approvalIds: string[];
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
    reason?: string;
  }) {
    const ctx = this.contextService.getContext();

    this.logger.debug(`Bulk deciding ${params.approvalIds.length} approvals`, {
      decision: params.decision,
    });

    try {
      const response = await firstValueFrom(
        this.apiClient.bulkDecideApprovals({
          xTenantId: ctx.tenantId,
          xOrgId: ctx.orgId,
          xCycleId: ctx.cycleId,
          xRequestId: ctx.requestId,
          acceptLanguage: ctx.acceptLanguage,
          bulkApprovalDecisionRequest: {
            approvalIds: params.approvalIds,
            decision: params.decision,
            reason: params.reason,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'bulkDecideApprovals');
    }
  }

  /**
   * Check if error is a 404 Not Found
   */
  private isNotFoundError(error: unknown): boolean {
    const status = this.extractStatus(error);
    return status === 404;
  }

  /**
   * Extract HTTP status from error
   */
  private extractStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;

    const e = error as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;

    if (e.response && typeof e.response === 'object') {
      const response = e.response as Record<string, unknown>;
      if (typeof response.status === 'number') return response.status;
    }

    return null;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: unknown, operation: string): never {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    this.logger.error(`API error in ${operation}: ${message}`, error);

    throw new UpstreamServiceException('Core API', message);
  }
}
