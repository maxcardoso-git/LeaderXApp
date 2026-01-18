import { randomUUID } from 'crypto';
import { GovernanceDecision, PolicyEvaluationContext } from '../value-objects';

export interface GovernanceAuditLogProps {
  id?: string;
  tenantId: string;
  policyCode: string;
  policyId?: string;
  decision: GovernanceDecision;
  context: PolicyEvaluationContext;
  reason?: string;
  evaluatedAt?: Date;
  createdAt?: Date;
}

export class GovernanceAuditLog {
  private _id: string;
  private _tenantId: string;
  private _policyCode: string;
  private _policyId?: string;
  private _decision: GovernanceDecision;
  private _context: PolicyEvaluationContext;
  private _reason?: string;
  private _evaluatedAt: Date;
  private _createdAt: Date;

  private constructor(props: GovernanceAuditLogProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._policyCode = props.policyCode;
    this._policyId = props.policyId;
    this._decision = props.decision;
    this._context = props.context;
    this._reason = props.reason;
    this._evaluatedAt = props.evaluatedAt ?? new Date();
    this._createdAt = props.createdAt ?? new Date();
  }

  static create(props: GovernanceAuditLogProps): GovernanceAuditLog {
    return new GovernanceAuditLog(props);
  }

  static reconstitute(props: GovernanceAuditLogProps): GovernanceAuditLog {
    return new GovernanceAuditLog(props);
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get policyCode(): string { return this._policyCode; }
  get policyId(): string | undefined { return this._policyId; }
  get decision(): GovernanceDecision { return this._decision; }
  get context(): PolicyEvaluationContext { return this._context; }
  get reason(): string | undefined { return this._reason; }
  get evaluatedAt(): Date { return this._evaluatedAt; }
  get createdAt(): Date { return this._createdAt; }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      policyCode: this._policyCode,
      policyId: this._policyId,
      decision: this._decision,
      context: this._context,
      reason: this._reason,
      evaluatedAt: this._evaluatedAt,
      createdAt: this._createdAt,
    };
  }
}
