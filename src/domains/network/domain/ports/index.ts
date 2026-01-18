import { NetworkNodeAggregate } from '../aggregates';
import { NetworkRelationEntity } from '../entities';
import { OwnerType, NodeStatus, NodeRole, RelationType } from '../value-objects';

// ============================================
// REPOSITORY PORTS
// ============================================

export const NETWORK_NODE_REPOSITORY = Symbol('NETWORK_NODE_REPOSITORY');
export const NETWORK_RELATION_REPOSITORY = Symbol('NETWORK_RELATION_REPOSITORY');

export interface NetworkNodeFilters {
  ownerId?: string;
  ownerType?: OwnerType;
  userId?: string;
  status?: NodeStatus;
  role?: NodeRole;
}

export interface INetworkNodeRepository {
  findById(id: string): Promise<NetworkNodeAggregate | null>;
  findByOwner(tenantId: string, ownerId: string, ownerType: OwnerType): Promise<NetworkNodeAggregate[]>;
  findByUserId(tenantId: string, userId: string): Promise<NetworkNodeAggregate[]>;
  findWithFilters(tenantId: string, filters: NetworkNodeFilters): Promise<NetworkNodeAggregate[]>;
  findDescendants(tenantId: string, nodeId: string, maxDepth?: number): Promise<NetworkNodeAggregate[]>;
  findAncestors(tenantId: string, nodeId: string): Promise<NetworkNodeAggregate[]>;
  save(node: NetworkNodeAggregate): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface INetworkRelationRepository {
  findById(id: string): Promise<NetworkRelationEntity | null>;
  findByParentNodeId(tenantId: string, parentNodeId: string): Promise<NetworkRelationEntity[]>;
  findByChildNodeId(tenantId: string, childNodeId: string): Promise<NetworkRelationEntity[]>;
  findByNodes(parentNodeId: string, childNodeId: string): Promise<NetworkRelationEntity | null>;
  save(relation: NetworkRelationEntity): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByNodes(parentNodeId: string, childNodeId: string): Promise<void>;
}

// ============================================
// CROSS-DOMAIN READ PORTS
// ============================================

export const IDENTITY_READ_PORT = Symbol('IDENTITY_READ_PORT');

export interface UserInfo {
  id: string;
  tenantId: string;
  email?: string;
  fullName?: string;
  status: string;
}

export interface IIdentityReadPort {
  getUserById(userId: string): Promise<UserInfo | null>;
  getUsersByTenant(tenantId: string): Promise<UserInfo[]>;
}

// ============================================
// TRANSACTION CONTEXT
// ============================================

export interface TransactionContext {
  tx?: unknown;
}
