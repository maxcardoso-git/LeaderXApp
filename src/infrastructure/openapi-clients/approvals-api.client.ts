import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import {
  ApprovalDetailResponse,
  PagedApprovalsResponse,
  ApprovalDecisionResponse,
  BulkApprovalDecisionResponse,
} from './types';

export interface ListApprovalsRequest {
  xTenantId: string;
  xOrgId: string;
  xCycleId?: string;
  xRequestId?: string;
  acceptLanguage?: string;
  state?: string;
  type?: string;
  priority?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface GetApprovalRequest {
  xTenantId: string;
  xOrgId: string;
  xCycleId?: string;
  xRequestId?: string;
  acceptLanguage?: string;
  approvalId: string;
}

export interface DecideApprovalRequest {
  xTenantId: string;
  xOrgId: string;
  xCycleId?: string;
  xRequestId?: string;
  acceptLanguage?: string;
  approvalId: string;
  approvalDecisionRequest: {
    decision: string;
    reason?: string;
  };
}

export interface BulkDecideApprovalsRequest {
  xTenantId: string;
  xOrgId: string;
  xCycleId?: string;
  xRequestId?: string;
  acceptLanguage?: string;
  bulkApprovalDecisionRequest: {
    approvalIds: string[];
    decision: string;
    reason?: string;
  };
}

@Injectable()
export class ApprovalsApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('CORE_API_BASE_URL', 'http://localhost:3001');
    this.token = this.config.get<string>('CORE_API_TOKEN', '');
  }

  private getHeaders(req: { xTenantId: string; xOrgId: string; xCycleId?: string; xRequestId?: string; acceptLanguage?: string }) {
    return {
      'Authorization': `Bearer ${this.token}`,
      'X-Tenant-Id': req.xTenantId,
      'X-Org-Id': req.xOrgId,
      ...(req.xCycleId && { 'X-Cycle-Id': req.xCycleId }),
      ...(req.xRequestId && { 'X-Request-Id': req.xRequestId }),
      ...(req.acceptLanguage && { 'Accept-Language': req.acceptLanguage }),
    };
  }

  listApprovals(req: ListApprovalsRequest): Observable<{ data: PagedApprovalsResponse }> {
    const params = new URLSearchParams();
    if (req.state) params.append('state', req.state);
    if (req.type) params.append('type', req.type);
    if (req.priority) params.append('priority', req.priority);
    if (req.q) params.append('q', req.q);
    if (req.page !== undefined) params.append('page', String(req.page));
    if (req.size !== undefined) params.append('size', String(req.size));
    if (req.sort) params.append('sort', req.sort);

    return this.http.get<PagedApprovalsResponse>(
      `${this.baseUrl}/approvals?${params.toString()}`,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  getApproval(req: GetApprovalRequest): Observable<{ data: ApprovalDetailResponse }> {
    return this.http.get<ApprovalDetailResponse>(
      `${this.baseUrl}/approvals/${req.approvalId}`,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  decideApproval(req: DecideApprovalRequest): Observable<{ data: ApprovalDecisionResponse }> {
    return this.http.post<ApprovalDecisionResponse>(
      `${this.baseUrl}/approvals/${req.approvalId}/decision`,
      req.approvalDecisionRequest,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  bulkDecideApprovals(req: BulkDecideApprovalsRequest): Observable<{ data: BulkApprovalDecisionResponse }> {
    return this.http.post<BulkApprovalDecisionResponse>(
      `${this.baseUrl}/approvals/bulk/decision`,
      req.bulkApprovalDecisionRequest,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}
