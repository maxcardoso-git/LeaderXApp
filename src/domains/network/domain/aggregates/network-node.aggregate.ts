import {
  NodeStatus,
  NodeRole,
  OwnerType,
  ROLE_HIERARCHY,
} from '../value-objects';
import { NetworkRelationEntity } from '../entities';

export interface NetworkNodeProps {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerType: OwnerType;
  userId?: string;
  role: NodeRole;
  status: NodeStatus;
  hierarchyLevel: number;
  metadata?: Record<string, unknown>;
  parentRelations?: NetworkRelationEntity[];
  childRelations?: NetworkRelationEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export class NetworkNodeAggregate {
  readonly id: string;
  readonly tenantId: string;
  readonly ownerId: string;
  readonly ownerType: OwnerType;
  readonly userId?: string;
  private _role: NodeRole;
  private _status: NodeStatus;
  private _hierarchyLevel: number;
  private _metadata?: Record<string, unknown>;
  readonly parentRelations: NetworkRelationEntity[];
  readonly childRelations: NetworkRelationEntity[];
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: NetworkNodeProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.ownerId = props.ownerId;
    this.ownerType = props.ownerType;
    this.userId = props.userId;
    this._role = props.role;
    this._status = props.status;
    this._hierarchyLevel = props.hierarchyLevel;
    this._metadata = props.metadata;
    this.parentRelations = props.parentRelations || [];
    this.childRelations = props.childRelations || [];
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get role(): NodeRole {
    return this._role;
  }

  get status(): NodeStatus {
    return this._status;
  }

  get hierarchyLevel(): number {
    return this._hierarchyLevel;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Check if this node is active.
   */
  isActive(): boolean {
    return this._status === NodeStatus.ACTIVE;
  }

  /**
   * Check if this node can approve based on role hierarchy.
   */
  canApprove(targetRole: NodeRole): boolean {
    if (!this.isActive()) return false;
    return ROLE_HIERARCHY[this._role] > ROLE_HIERARCHY[targetRole];
  }

  /**
   * Check if this node has authority over another node based on hierarchy level.
   */
  hasAuthorityOver(otherNode: NetworkNodeAggregate): boolean {
    if (!this.isActive()) return false;
    if (this.tenantId !== otherNode.tenantId) return false;
    if (this.ownerId !== otherNode.ownerId) return false;
    if (this.ownerType !== otherNode.ownerType) return false;

    // Higher role always has authority
    if (ROLE_HIERARCHY[this._role] > ROLE_HIERARCHY[otherNode.role]) {
      return true;
    }

    // Same role: lower hierarchy level (closer to root) has authority
    if (this._role === otherNode.role) {
      return this._hierarchyLevel < otherNode.hierarchyLevel;
    }

    return false;
  }

  /**
   * Update the node's role.
   */
  updateRole(newRole: NodeRole): void {
    this._role = newRole;
    this._updatedAt = new Date();
  }

  /**
   * Update the node's status.
   */
  updateStatus(newStatus: NodeStatus): void {
    this._status = newStatus;
    this._updatedAt = new Date();
  }

  /**
   * Deactivate the node.
   */
  deactivate(): void {
    this._status = NodeStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Suspend the node.
   */
  suspend(): void {
    this._status = NodeStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  /**
   * Reactivate the node.
   */
  reactivate(): void {
    this._status = NodeStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Update hierarchy level (called when parent changes).
   */
  updateHierarchyLevel(level: number): void {
    this._hierarchyLevel = level;
    this._updatedAt = new Date();
  }

  /**
   * Update metadata.
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
    this._updatedAt = new Date();
  }

  /**
   * Get parent node IDs.
   */
  getParentNodeIds(): string[] {
    return this.parentRelations.map((r) => r.parentNodeId);
  }

  /**
   * Get child node IDs.
   */
  getChildNodeIds(): string[] {
    return this.childRelations.map((r) => r.childNodeId);
  }

  /**
   * Check if this node has a specific parent.
   */
  hasParent(parentNodeId: string): boolean {
    return this.parentRelations.some((r) => r.parentNodeId === parentNodeId);
  }

  /**
   * Check if this node has a specific child.
   */
  hasChild(childNodeId: string): boolean {
    return this.childRelations.some((r) => r.childNodeId === childNodeId);
  }
}
