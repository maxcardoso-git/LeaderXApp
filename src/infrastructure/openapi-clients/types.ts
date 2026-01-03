// Stub types for OpenAPI clients - to be replaced with proper generated clients

export interface ApprovalDecisionRequest {
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
}

export interface ApprovalDecisionResponse {
  id: string;
  status: string;
  message?: string;
}

export interface ApprovalDetailResponse {
  id: string;
  type: string;
  state: string;
  candidateId?: string;
  candidateName?: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PagedApprovalsResponse {
  items: ApprovalDetailResponse[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface BulkApprovalDecisionRequest {
  approvalIds: string[];
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
}

export interface BulkApprovalDecisionResponse {
  results: Array<{
    approvalId: string;
    success: boolean;
    error?: string;
  }>;
}

export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
