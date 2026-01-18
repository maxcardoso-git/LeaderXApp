import { ComplianceResultStatus, EvidenceItem } from '../value-objects';

export interface ComplianceCheckResultProps {
  id: string;
  tenantId: string;
  checkId: string;
  checkCode: string;
  reportId?: string;
  status: ComplianceResultStatus;
  evidence: EvidenceItem[];
  executedAt: Date;
  createdAt: Date;
}

export class ComplianceCheckResultEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly checkId: string;
  readonly checkCode: string;
  readonly reportId?: string;
  readonly status: ComplianceResultStatus;
  readonly evidence: EvidenceItem[];
  readonly executedAt: Date;
  readonly createdAt: Date;

  constructor(props: ComplianceCheckResultProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.checkId = props.checkId;
    this.checkCode = props.checkCode;
    this.reportId = props.reportId;
    this.status = props.status;
    this.evidence = props.evidence;
    this.executedAt = props.executedAt;
    this.createdAt = props.createdAt;
  }

  /**
   * Check if the result indicates a failure.
   */
  isFailed(): boolean {
    return this.status === ComplianceResultStatus.FAIL;
  }

  /**
   * Check if the result indicates a warning.
   */
  isWarning(): boolean {
    return this.status === ComplianceResultStatus.WARNING;
  }

  /**
   * Check if the result indicates a pass.
   */
  isPassed(): boolean {
    return this.status === ComplianceResultStatus.PASS;
  }
}
