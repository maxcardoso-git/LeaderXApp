// ============================================
// NETWORK DOMAIN - VALUE OBJECTS
// ============================================

export enum NodeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum NodeRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EMBAIXADOR = 'EMBAIXADOR',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum OwnerType {
  TENANT = 'TENANT',
  COMMUNITY = 'COMMUNITY',
  EVENT = 'EVENT',
  TABLE = 'TABLE',
  NETWORK = 'NETWORK',
}

export enum RelationType {
  DIRECT = 'DIRECT',
  INVITED = 'INVITED',
  DELEGATED = 'DELEGATED',
}

// Role hierarchy for approval authority
export const ROLE_HIERARCHY: Record<NodeRole, number> = {
  [NodeRole.OWNER]: 100,
  [NodeRole.ADMIN]: 80,
  [NodeRole.EMBAIXADOR]: 60,
  [NodeRole.MEMBER]: 40,
  [NodeRole.GUEST]: 20,
};

export interface ApprovalRule {
  minApprovers: number;
  allowedRoles: NodeRole[];
  maxDepth: number;
}

export interface ApprovalChainNode {
  nodeId: string;
  userId?: string;
  role: NodeRole;
  hierarchyLevel: number;
  canApprove: boolean;
}

export interface ApprovalChain {
  targetNodeId: string;
  chain: ApprovalChainNode[];
  calculatedAt: Date;
}

export interface HierarchyPath {
  nodeId: string;
  ancestors: string[];
  descendants: string[];
  depth: number;
}
