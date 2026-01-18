import { ComplianceCheckAggregate } from '../aggregates';
import { ComplianceCheckResultEntity } from '../entities';
import { ComplianceReportAggregate } from '../aggregates';

// ============================================
// REPOSITORY PORTS
// ============================================

export const COMPLIANCE_CHECK_REPOSITORY = Symbol('COMPLIANCE_CHECK_REPOSITORY');
export const COMPLIANCE_RESULT_REPOSITORY = Symbol('COMPLIANCE_RESULT_REPOSITORY');
export const COMPLIANCE_REPORT_REPOSITORY = Symbol('COMPLIANCE_REPORT_REPOSITORY');

export interface IComplianceCheckRepository {
  findById(id: string): Promise<ComplianceCheckAggregate | null>;
  findByCode(code: string): Promise<ComplianceCheckAggregate | null>;
  findAll(tenantId?: string): Promise<ComplianceCheckAggregate[]>;
  findAllEnabled(tenantId?: string): Promise<ComplianceCheckAggregate[]>;
  save(check: ComplianceCheckAggregate): Promise<void>;
}

export interface IComplianceResultRepository {
  save(result: ComplianceCheckResultEntity): Promise<void>;
  saveMany(results: ComplianceCheckResultEntity[]): Promise<void>;
  findByReportId(reportId: string): Promise<ComplianceCheckResultEntity[]>;
  findByCheckCode(tenantId: string, checkCode: string, limit?: number): Promise<ComplianceCheckResultEntity[]>;
}

export interface IComplianceReportRepository {
  findById(id: string): Promise<ComplianceReportAggregate | null>;
  findLatest(tenantId: string): Promise<ComplianceReportAggregate | null>;
  findAll(tenantId: string, limit?: number): Promise<ComplianceReportAggregate[]>;
  save(report: ComplianceReportAggregate): Promise<void>;
}

// ============================================
// CROSS-DOMAIN READ PORTS
// ============================================

export const GOVERNANCE_READ_PORT = Symbol('GOVERNANCE_READ_PORT');
export const IDENTITY_READ_PORT = Symbol('IDENTITY_READ_PORT');
export const EVENTS_READ_PORT = Symbol('EVENTS_READ_PORT');
export const POINTS_READ_PORT = Symbol('POINTS_READ_PORT');

export interface GovernanceSummary {
  totalPolicies: number;
  activePolicies: number;
  deprecatedPolicies: number;
}

export interface GovernanceEvaluation {
  policyCode: string;
  decision: string;
  evaluatedAt: Date;
}

export interface IGovernanceReadPort {
  getComplianceSummary(tenantId: string): Promise<GovernanceSummary | null>;
  getRecentEvaluations(tenantId: string, limit: number): Promise<GovernanceEvaluation[]>;
}

export interface IdentitySummary {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
}

export interface AccessAssignmentRecord {
  userId: string;
  roleCode: string;
  scopeType: string;
  assignedAt: Date;
}

export interface IIdentityReadPort {
  getAccessSummary(tenantId: string): Promise<IdentitySummary | null>;
  getRecentAssignments(tenantId: string, limit: number): Promise<AccessAssignmentRecord[]>;
}

export interface EventsSummary {
  totalEvents: number;
  activeEvents: number;
  draftEvents: number;
  closedEvents: number;
}

export interface EventRecord {
  id: string;
  name: string;
  status: string;
  startsAt: Date;
}

export interface IEventsReadPort {
  getEventsSummary(tenantId: string): Promise<EventsSummary | null>;
  getRecentEvents(tenantId: string, limit: number): Promise<EventRecord[]>;
}

export interface PointsSummary {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalHolds: number;
}

export interface PointTransaction {
  accountId: string;
  entryType: string;
  amount: number;
  createdAt: Date;
}

export interface IPointsReadPort {
  getLedgerSummary(tenantId: string): Promise<PointsSummary | null>;
  getRecentTransactions(tenantId: string, limit: number): Promise<PointTransaction[]>;
}

// ============================================
// TRANSACTION CONTEXT
// ============================================

export interface TransactionContext {
  tx?: unknown;
}
