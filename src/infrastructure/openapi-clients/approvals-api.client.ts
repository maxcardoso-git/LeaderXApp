import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, of, map } from 'rxjs';
import {
  ApprovalDetailResponse,
  PagedApprovalsResponse,
  ApprovalDecisionResponse,
  BulkApprovalDecisionResponse,
} from './types';

// Mock data for development/testing
const MOCK_APPROVALS: ApprovalDetailResponse[] = [
  {
    id: 'apr-001',
    type: 'SALARY_INCREASE',
    state: 'PENDING',
    candidateId: 'cand-001',
    candidateName: 'João Silva',
    priority: 'HIGH',
    createdAt: '2026-01-01T10:00:00Z',
    metadata: { percentageIncrease: 15, currentSalary: 5000 },
  },
  {
    id: 'apr-002',
    type: 'PROMOTION',
    state: 'PENDING',
    candidateId: 'cand-002',
    candidateName: 'Maria Santos',
    priority: 'MEDIUM',
    createdAt: '2026-01-02T14:30:00Z',
    metadata: { newPosition: 'Senior Developer', department: 'Engineering' },
  },
  {
    id: 'apr-003',
    type: 'BONUS',
    state: 'APPROVED',
    candidateId: 'cand-003',
    candidateName: 'Carlos Oliveira',
    priority: 'LOW',
    createdAt: '2026-01-02T09:15:00Z',
    updatedAt: '2026-01-02T16:00:00Z',
    metadata: { bonusAmount: 2000, reason: 'Exceptional performance' },
  },
];

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
  private readonly logger = new Logger(ApprovalsApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly useMock: boolean;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('CORE_API_BASE_URL', 'http://localhost:3001');
    this.token = this.config.get<string>('CORE_API_TOKEN', '');
    this.useMock = this.config.get<string>('USE_MOCK_API', 'true') === 'true';

    if (this.useMock) {
      this.logger.warn('Using MOCK API responses - set USE_MOCK_API=false for real API calls');
    }
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
    if (this.useMock) {
      let items = [...MOCK_APPROVALS];

      // Apply filters
      if (req.state) {
        items = items.filter(a => a.state === req.state);
      }
      if (req.type) {
        items = items.filter(a => a.type === req.type);
      }
      if (req.priority) {
        items = items.filter(a => a.priority === req.priority);
      }
      if (req.q) {
        const query = req.q.toLowerCase();
        items = items.filter(a =>
          a.candidateName?.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query)
        );
      }

      const page = req.page || 0;
      const size = req.size || 10;
      const start = page * size;
      const paged = items.slice(start, start + size);

      return of({
        data: {
          items: paged,
          page,
          size,
          total: items.length,
          totalPages: Math.ceil(items.length / size),
        },
      });
    }

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
    if (this.useMock) {
      const approval = MOCK_APPROVALS.find(a => a.id === req.approvalId);
      if (!approval) {
        throw { response: { status: 404 }, message: 'Approval not found' };
      }
      return of({ data: approval });
    }

    return this.http.get<ApprovalDetailResponse>(
      `${this.baseUrl}/approvals/${req.approvalId}`,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  decideApproval(req: DecideApprovalRequest): Observable<{ data: ApprovalDecisionResponse }> {
    if (this.useMock) {
      this.logger.log(`[MOCK] Deciding approval ${req.approvalId}: ${req.approvalDecisionRequest.decision}`);

      // Update mock data
      const approval = MOCK_APPROVALS.find(a => a.id === req.approvalId);
      if (approval) {
        approval.state = req.approvalDecisionRequest.decision === 'APPROVE' ? 'APPROVED' :
                         req.approvalDecisionRequest.decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED';
        approval.updatedAt = new Date().toISOString();
      }

      return of({
        data: {
          id: req.approvalId,
          status: 'DECIDED',
          message: `Approval ${req.approvalId} decided as ${req.approvalDecisionRequest.decision}`,
        },
      });
    }

    return this.http.post<ApprovalDecisionResponse>(
      `${this.baseUrl}/approvals/${req.approvalId}/decision`,
      req.approvalDecisionRequest,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  bulkDecideApprovals(req: BulkDecideApprovalsRequest): Observable<{ data: BulkApprovalDecisionResponse }> {
    if (this.useMock) {
      this.logger.log(`[MOCK] Bulk deciding ${req.bulkApprovalDecisionRequest.approvalIds.length} approvals`);

      const results = req.bulkApprovalDecisionRequest.approvalIds.map(id => {
        const approval = MOCK_APPROVALS.find(a => a.id === id);
        if (approval) {
          approval.state = req.bulkApprovalDecisionRequest.decision === 'APPROVE' ? 'APPROVED' :
                           req.bulkApprovalDecisionRequest.decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED';
          approval.updatedAt = new Date().toISOString();
          return { approvalId: id, success: true };
        }
        return { approvalId: id, success: false, error: 'Not found' };
      });

      return of({ data: { results } });
    }

    return this.http.post<BulkApprovalDecisionResponse>(
      `${this.baseUrl}/approvals/bulk/decision`,
      req.bulkApprovalDecisionRequest,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}
