import {
  MemberJourneyInstance,
  MemberJourneyTransitionLog,
  MemberApprovalRequest,
  MemberJourneyDefinition,
  CreateJourneyInstanceInput,
  TransitionStateInput,
  CreateApprovalRequestInput,
  ResolveApprovalInput,
  CreateJourneyDefinitionInput,
  UpdateJourneyDefinitionInput,
  JourneyInstanceFilters,
  TransitionLogFilters,
  ApprovalRequestFilters,
  PagedResult,
} from './types';

// ============================================
// Repository Ports (Interfaces)
// ============================================

export const JOURNEY_INSTANCE_REPOSITORY = Symbol('JOURNEY_INSTANCE_REPOSITORY');

export interface JourneyInstanceRepository {
  create(input: CreateJourneyInstanceInput): Promise<MemberJourneyInstance>;
  findById(tenantId: string, id: string): Promise<MemberJourneyInstance | null>;
  findByMember(tenantId: string, memberId: string, journeyCode: string): Promise<MemberJourneyInstance | null>;
  updateState(tenantId: string, id: string, newState: string): Promise<MemberJourneyInstance>;
  search(filters: JourneyInstanceFilters): Promise<PagedResult<MemberJourneyInstance>>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const TRANSITION_LOG_REPOSITORY = Symbol('TRANSITION_LOG_REPOSITORY');

export interface TransitionLogRepository {
  create(input: TransitionStateInput): Promise<MemberJourneyTransitionLog>;
  findById(tenantId: string, id: string): Promise<MemberJourneyTransitionLog | null>;
  search(filters: TransitionLogFilters): Promise<PagedResult<MemberJourneyTransitionLog>>;
  getLatestByInstance(tenantId: string, journeyInstanceId: string): Promise<MemberJourneyTransitionLog | null>;
}

export const APPROVAL_REQUEST_REPOSITORY = Symbol('APPROVAL_REQUEST_REPOSITORY');

export interface ApprovalRequestRepository {
  create(input: CreateApprovalRequestInput): Promise<MemberApprovalRequest>;
  findById(tenantId: string, id: string): Promise<MemberApprovalRequest | null>;
  findByKanbanCardId(tenantId: string, kanbanCardId: string): Promise<MemberApprovalRequest | null>;
  resolve(input: ResolveApprovalInput): Promise<MemberApprovalRequest>;
  search(filters: ApprovalRequestFilters): Promise<PagedResult<MemberApprovalRequest>>;
  findPendingByMember(tenantId: string, memberId: string): Promise<MemberApprovalRequest[]>;
  updateKanbanCardId(tenantId: string, id: string, kanbanCardId: string): Promise<void>;
}

// ============================================
// Journey Definition Repository
// ============================================

export const JOURNEY_DEFINITION_REPOSITORY = Symbol('JOURNEY_DEFINITION_REPOSITORY');

export interface JourneyDefinitionRepository {
  create(input: CreateJourneyDefinitionInput): Promise<MemberJourneyDefinition>;
  findById(tenantId: string, id: string): Promise<MemberJourneyDefinition | null>;
  findByCode(tenantId: string, code: string, version?: string): Promise<MemberJourneyDefinition | null>;
  findActive(tenantId: string, code: string): Promise<MemberJourneyDefinition | null>;
  update(tenantId: string, id: string, input: UpdateJourneyDefinitionInput): Promise<MemberJourneyDefinition>;
  delete(tenantId: string, id: string): Promise<void>;
  list(tenantId: string): Promise<MemberJourneyDefinition[]>;
}

// ============================================
// PLM Integration Port
// ============================================

export const PLM_INTEGRATION_PORT = Symbol('PLM_INTEGRATION_PORT');

export interface PlmCardCreationInput {
  tenantId: string;
  pipelineId: string;
  title: string;
  description?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

export interface PlmIntegrationPort {
  createCard(input: PlmCardCreationInput): Promise<{ cardId: string }>;
}

// ============================================
// Governance Policy Lookup Port
// ============================================

export const GOVERNANCE_POLICY_PORT = Symbol('GOVERNANCE_POLICY_PORT');

export interface GovernancePolicyInfo {
  id: string;
  code: string;
  pipelineId: string;
  blocking: boolean;
}

export interface GovernancePolicyPort {
  findByCode(code: string): Promise<GovernancePolicyInfo | null>;
}
