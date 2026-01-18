import { NodeRole, NodeStatus, OwnerType, RelationType, ApprovalChain } from '../value-objects';

// ============================================
// NETWORK DOMAIN EVENTS
// ============================================

export interface NetworkNodeCreatedEvent {
  type: 'NetworkNodeCreated';
  payload: {
    nodeId: string;
    tenantId: string;
    ownerId: string;
    ownerType: OwnerType;
    userId?: string;
    role: NodeRole;
    createdAt: Date;
  };
}

export interface NetworkNodeUpdatedEvent {
  type: 'NetworkNodeUpdated';
  payload: {
    nodeId: string;
    tenantId: string;
    changes: {
      role?: NodeRole;
      status?: NodeStatus;
      hierarchyLevel?: number;
      metadata?: Record<string, unknown>;
    };
    updatedAt: Date;
  };
}

export interface NetworkNodeDeactivatedEvent {
  type: 'NetworkNodeDeactivated';
  payload: {
    nodeId: string;
    tenantId: string;
    previousStatus: NodeStatus;
    deactivatedAt: Date;
  };
}

export interface NetworkRelationCreatedEvent {
  type: 'NetworkRelationCreated';
  payload: {
    relationId: string;
    tenantId: string;
    parentNodeId: string;
    childNodeId: string;
    relationType: RelationType;
    createdAt: Date;
  };
}

export interface NetworkRelationRemovedEvent {
  type: 'NetworkRelationRemoved';
  payload: {
    relationId: string;
    tenantId: string;
    parentNodeId: string;
    childNodeId: string;
    removedAt: Date;
  };
}

export interface ApprovalChainCalculatedEvent {
  type: 'ApprovalChainCalculated';
  payload: {
    targetNodeId: string;
    tenantId: string;
    chain: ApprovalChain;
    calculatedAt: Date;
  };
}

export interface ApprovalAuthorityValidatedEvent {
  type: 'ApprovalAuthorityValidated';
  payload: {
    approverNodeId: string;
    targetNodeId: string;
    tenantId: string;
    hasAuthority: boolean;
    validatedAt: Date;
  };
}

export type NetworkDomainEvent =
  | NetworkNodeCreatedEvent
  | NetworkNodeUpdatedEvent
  | NetworkNodeDeactivatedEvent
  | NetworkRelationCreatedEvent
  | NetworkRelationRemovedEvent
  | ApprovalChainCalculatedEvent
  | ApprovalAuthorityValidatedEvent;
