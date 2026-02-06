// ============================================
// Member Journey Domain Types
// ============================================

export type JourneyTransitionOrigin = 'USER' | 'ADMIN' | 'SYSTEM' | 'APPROVAL_ENGINE';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MemberJourneyInstance {
  id: string;
  tenantId: string;
  memberId: string;
  journeyCode: string;
  journeyVersion: string;
  currentState: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberJourneyTransitionLog {
  id: string;
  tenantId: string;
  memberId: string;
  journeyInstanceId: string;
  fromState: string | null;
  toState: string;
  trigger: string;
  origin: JourneyTransitionOrigin;
  actorId: string | null;
  approvalRequestId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MemberApprovalRequest {
  id: string;
  tenantId: string;
  memberId: string;
  journeyInstanceId: string;
  journeyTrigger: string;
  policyCode: string;
  status: ApprovalStatus;
  kanbanCardId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

// ============================================
// Input/Output DTOs
// ============================================

export interface CreateJourneyInstanceInput {
  tenantId: string;
  memberId: string;
  journeyCode: string;
  journeyVersion?: string;
  initialState: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionStateInput {
  tenantId: string;
  journeyInstanceId: string;
  trigger: string;
  toState: string;
  origin: JourneyTransitionOrigin;
  actorId?: string;
  approvalRequestId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateApprovalRequestInput {
  tenantId: string;
  memberId: string;
  journeyInstanceId: string;
  journeyTrigger: string;
  policyCode: string;
  kanbanCardId?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolveApprovalInput {
  tenantId: string;
  approvalRequestId: string;
  status: 'APPROVED' | 'REJECTED';
  resolvedBy: string;
}

export interface JourneyInstanceFilters {
  tenantId: string;
  memberId?: string;
  journeyCode?: string;
  currentState?: string;
  page?: number;
  size?: number;
}

export interface TransitionLogFilters {
  tenantId: string;
  memberId?: string;
  journeyInstanceId?: string;
  trigger?: string;
  origin?: JourneyTransitionOrigin;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  size?: number;
}

export interface ApprovalRequestFilters {
  tenantId: string;
  memberId?: string;
  journeyInstanceId?: string;
  status?: ApprovalStatus;
  policyCode?: string;
  page?: number;
  size?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
