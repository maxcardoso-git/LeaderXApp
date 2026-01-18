import { ComplianceSummary, ComplianceResultStatus, EvidenceItem } from '../value-objects';

// ============================================
// AUDIT & COMPLIANCE DOMAIN EVENTS
// ============================================

export interface ComplianceCheckCreatedEvent {
  type: 'ComplianceCheckCreated';
  payload: {
    checkId: string;
    tenantId?: string;
    code: string;
    name: string;
    severity: string;
    enabled: boolean;
    createdAt: Date;
  };
}

export interface ComplianceCheckExecutedEvent {
  type: 'ComplianceCheckExecuted';
  payload: {
    checkId: string;
    checkCode: string;
    tenantId: string;
    status: ComplianceResultStatus;
    executedAt: Date;
  };
}

export interface ComplianceCheckFailedEvent {
  type: 'ComplianceCheckFailed';
  payload: {
    checkId: string;
    checkCode: string;
    tenantId: string;
    severity: string;
    evidence: EvidenceItem[];
    executedAt: Date;
  };
}

export interface ComplianceReportGeneratedEvent {
  type: 'ComplianceReportGenerated';
  payload: {
    reportId: string;
    tenantId: string;
    summary: ComplianceSummary;
    generatedAt: Date;
  };
}

export type AuditDomainEvent =
  | ComplianceCheckCreatedEvent
  | ComplianceCheckExecutedEvent
  | ComplianceCheckFailedEvent
  | ComplianceReportGeneratedEvent;
