import { ScopeType, AssignmentStatus } from '../value-objects';

export interface AccessAssignmentProps {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  status: AssignmentStatus;
  assignedBy?: string;
  assignedAt: Date;
  revokedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccessAssignmentProps {
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  assignedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AccessAssignment Aggregate Root
 * Assigns a Role to a User with a specific scope
 * Defines where the Role applies (GLOBAL, TENANT, EVENT, etc.)
 */
export class AccessAssignment {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _userId: string;
  private readonly _roleId: string;
  private readonly _scopeType: ScopeType;
  private readonly _scopeId?: string;
  private _status: AssignmentStatus;
  private readonly _assignedBy?: string;
  private readonly _assignedAt: Date;
  private _revokedAt?: Date;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AccessAssignmentProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._userId = props.userId;
    this._roleId = props.roleId;
    this._scopeType = props.scopeType;
    this._scopeId = props.scopeId;
    this._status = props.status;
    this._assignedBy = props.assignedBy;
    this._assignedAt = props.assignedAt;
    this._revokedAt = props.revokedAt;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(id: string, props: CreateAccessAssignmentProps): AccessAssignment {
    AccessAssignment.validateScope(props.scopeType, props.scopeId);

    const now = new Date();
    return new AccessAssignment({
      id,
      tenantId: props.tenantId,
      userId: props.userId,
      roleId: props.roleId,
      scopeType: props.scopeType,
      scopeId: props.scopeId,
      status: AssignmentStatus.ACTIVE,
      assignedBy: props.assignedBy,
      assignedAt: now,
      revokedAt: undefined,
      metadata: props.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: AccessAssignmentProps): AccessAssignment {
    return new AccessAssignment(props);
  }

  private static validateScope(scopeType: ScopeType, scopeId?: string): void {
    // GLOBAL and TENANT don't require scopeId
    const scopesRequiringScopeId = [
      ScopeType.EVENT,
      ScopeType.COMMUNITY,
      ScopeType.TABLE,
      ScopeType.NETWORK_NODE,
      ScopeType.RESOURCE,
    ];

    if (scopesRequiringScopeId.includes(scopeType) && !scopeId) {
      throw new Error(`scopeId is required for scopeType: ${scopeType}`);
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get userId(): string {
    return this._userId;
  }

  get roleId(): string {
    return this._roleId;
  }

  get scopeType(): ScopeType {
    return this._scopeType;
  }

  get scopeId(): string | undefined {
    return this._scopeId;
  }

  get status(): AssignmentStatus {
    return this._status;
  }

  get assignedBy(): string | undefined {
    return this._assignedBy;
  }

  get assignedAt(): Date {
    return this._assignedAt;
  }

  get revokedAt(): Date | undefined {
    return this._revokedAt;
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

  // Status checks
  isActive(): boolean {
    return this._status === AssignmentStatus.ACTIVE;
  }

  isRevoked(): boolean {
    return this._status === AssignmentStatus.REVOKED;
  }

  // Scope checks
  isGlobal(): boolean {
    return this._scopeType === ScopeType.GLOBAL;
  }

  isTenantScope(): boolean {
    return this._scopeType === ScopeType.TENANT;
  }

  isEventScope(): boolean {
    return this._scopeType === ScopeType.EVENT;
  }

  isCommunityScope(): boolean {
    return this._scopeType === ScopeType.COMMUNITY;
  }

  isTableScope(): boolean {
    return this._scopeType === ScopeType.TABLE;
  }

  isNetworkNodeScope(): boolean {
    return this._scopeType === ScopeType.NETWORK_NODE;
  }

  isResourceScope(): boolean {
    return this._scopeType === ScopeType.RESOURCE;
  }

  // Commands
  revoke(): void {
    if (this._status === AssignmentStatus.REVOKED) {
      return; // Already revoked, idempotent
    }

    const now = new Date();
    this._status = AssignmentStatus.REVOKED;
    this._revokedAt = now;
    this._updatedAt = now;
  }
}
