import { ApprovalId, ApprovalState, Priority } from '../value-objects';
import { ApprovalDecidedEvent } from '../events/approval-decided.event';
import { ApprovalCreatedEvent } from '../events/approval-created.event';

export interface ApprovalProps {
  id: ApprovalId;
  type: string;
  state: ApprovalState;
  candidateId: string;
  candidateName?: string;
  priority: Priority;
  tenantId: string;
  orgId: string;
  cycleId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  decisionReason?: string;
}

export interface CreateApprovalProps {
  type: string;
  candidateId: string;
  candidateName?: string;
  priority: Priority;
  tenantId: string;
  orgId: string;
  cycleId?: string;
  metadata?: Record<string, unknown>;
}

export type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

/**
 * Approval Aggregate Root
 *
 * Represents an approval request in the system.
 * This is the main aggregate for the Approvals bounded context.
 */
export class Approval {
  private readonly _id: ApprovalId;
  private readonly _type: string;
  private _state: ApprovalState;
  private readonly _candidateId: string;
  private readonly _candidateName?: string;
  private readonly _priority: Priority;
  private readonly _tenantId: string;
  private readonly _orgId: string;
  private readonly _cycleId?: string;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _decidedAt?: Date;
  private _decidedBy?: string;
  private _decisionReason?: string;

  private readonly _domainEvents: (ApprovalDecidedEvent | ApprovalCreatedEvent)[] = [];

  private constructor(props: ApprovalProps) {
    this._id = props.id;
    this._type = props.type;
    this._state = props.state;
    this._candidateId = props.candidateId;
    this._candidateName = props.candidateName;
    this._priority = props.priority;
    this._tenantId = props.tenantId;
    this._orgId = props.orgId;
    this._cycleId = props.cycleId;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._decidedAt = props.decidedAt;
    this._decidedBy = props.decidedBy;
    this._decisionReason = props.decisionReason;
  }

  /**
   * Create a new Approval aggregate
   */
  static create(props: CreateApprovalProps): Approval {
    const now = new Date();
    const approval = new Approval({
      id: ApprovalId.create(),
      type: props.type,
      state: ApprovalState.pending(),
      candidateId: props.candidateId,
      candidateName: props.candidateName,
      priority: props.priority,
      tenantId: props.tenantId,
      orgId: props.orgId,
      cycleId: props.cycleId,
      metadata: props.metadata,
      createdAt: now,
      updatedAt: now,
    });

    approval._domainEvents.push(
      new ApprovalCreatedEvent(
        approval._id.toString(),
        approval._type,
        approval._candidateId,
        approval._tenantId,
        approval._orgId,
        approval._cycleId,
      ),
    );

    return approval;
  }

  /**
   * Reconstitute an Approval from persistence
   */
  static reconstitute(props: ApprovalProps): Approval {
    return new Approval(props);
  }

  /**
   * Make a decision on this approval
   */
  decide(decision: Decision, decidedBy: string, reason?: string): void {
    if (!this._state.isPending()) {
      throw new Error(`Cannot decide approval ${this._id.toString()}: already decided`);
    }

    const newState = this.mapDecisionToState(decision);

    if (!this._state.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition from ${this._state.toString()} to ${newState.toString()}`);
    }

    this._state = newState;
    this._decidedAt = new Date();
    this._decidedBy = decidedBy;
    this._decisionReason = reason;
    this._updatedAt = new Date();

    this._domainEvents.push(
      new ApprovalDecidedEvent(
        this._id.toString(),
        decision,
        this._type,
        this._candidateId,
        decidedBy,
        this._tenantId,
        this._orgId,
        this._cycleId,
        reason,
      ),
    );
  }

  private mapDecisionToState(decision: Decision): ApprovalState {
    switch (decision) {
      case 'APPROVE':
        return ApprovalState.approved();
      case 'REJECT':
        return ApprovalState.rejected();
      case 'REQUEST_CHANGES':
        return ApprovalState.changesRequested();
    }
  }

  // Getters
  get id(): ApprovalId {
    return this._id;
  }

  get type(): string {
    return this._type;
  }

  get state(): ApprovalState {
    return this._state;
  }

  get candidateId(): string {
    return this._candidateId;
  }

  get candidateName(): string | undefined {
    return this._candidateName;
  }

  get priority(): Priority {
    return this._priority;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get orgId(): string {
    return this._orgId;
  }

  get cycleId(): string | undefined {
    return this._cycleId;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get decidedAt(): Date | undefined {
    return this._decidedAt;
  }

  get decidedBy(): string | undefined {
    return this._decidedBy;
  }

  get decisionReason(): string | undefined {
    return this._decisionReason;
  }

  /**
   * Get and clear domain events
   */
  pullDomainEvents(): (ApprovalDecidedEvent | ApprovalCreatedEvent)[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  /**
   * Convert to a plain object for persistence
   */
  toPersistence(): ApprovalProps {
    return {
      id: this._id,
      type: this._type,
      state: this._state,
      candidateId: this._candidateId,
      candidateName: this._candidateName,
      priority: this._priority,
      tenantId: this._tenantId,
      orgId: this._orgId,
      cycleId: this._cycleId,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      decidedAt: this._decidedAt,
      decidedBy: this._decidedBy,
      decisionReason: this._decisionReason,
    };
  }
}
