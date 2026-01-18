import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NetworkNodeAggregate } from '../../domain/aggregates';
import { NetworkRelationEntity } from '../../domain/entities';
import {
  NETWORK_NODE_REPOSITORY,
  NETWORK_RELATION_REPOSITORY,
  INetworkNodeRepository,
  INetworkRelationRepository,
  NetworkNodeFilters,
} from '../../domain/ports';
import {
  HierarchyValidatorService,
  ApprovalChainCalculatorService,
} from '../../domain/services';
import {
  NodeRole,
  NodeStatus,
  OwnerType,
  RelationType,
  ApprovalRule,
  ApprovalChain,
} from '../../domain/value-objects';

// ============================================
// CREATE NETWORK NODE
// ============================================

export interface CreateNetworkNodeInput {
  tenantId: string;
  ownerId: string;
  ownerType: OwnerType;
  userId?: string;
  role?: NodeRole;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreateNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(input: CreateNetworkNodeInput): Promise<NetworkNodeAggregate> {
    const now = new Date();
    const node = new NetworkNodeAggregate({
      id: randomUUID(),
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      userId: input.userId,
      role: input.role || NodeRole.MEMBER,
      status: NodeStatus.ACTIVE,
      hierarchyLevel: 0,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    await this.nodeRepository.save(node);
    return node;
  }
}

// ============================================
// UPDATE NETWORK NODE
// ============================================

export interface UpdateNetworkNodeInput {
  nodeId: string;
  role?: NodeRole;
  status?: NodeStatus;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UpdateNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(input: UpdateNetworkNodeInput): Promise<NetworkNodeAggregate> {
    const node = await this.nodeRepository.findById(input.nodeId);
    if (!node) {
      throw new NotFoundException(`Network node not found: ${input.nodeId}`);
    }

    if (input.role) {
      node.updateRole(input.role);
    }
    if (input.status) {
      node.updateStatus(input.status);
    }
    if (input.metadata) {
      node.updateMetadata(input.metadata);
    }

    await this.nodeRepository.save(node);
    return node;
  }
}

// ============================================
// DEACTIVATE NETWORK NODE
// ============================================

@Injectable()
export class DeactivateNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(nodeId: string): Promise<NetworkNodeAggregate> {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Network node not found: ${nodeId}`);
    }

    node.deactivate();
    await this.nodeRepository.save(node);
    return node;
  }
}

// ============================================
// LINK NETWORK NODE
// ============================================

export interface LinkNetworkNodeInput {
  tenantId: string;
  childNodeId: string;
  parentNodeId: string;
  relationType?: RelationType;
}

@Injectable()
export class LinkNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
    @Inject(NETWORK_RELATION_REPOSITORY)
    private readonly relationRepository: INetworkRelationRepository,
    private readonly hierarchyValidator: HierarchyValidatorService,
  ) {}

  async execute(input: LinkNetworkNodeInput): Promise<NetworkRelationEntity> {
    // Validate hierarchy
    const validation = await this.hierarchyValidator.validateLink(
      input.tenantId,
      input.parentNodeId,
      input.childNodeId,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Check if relation already exists
    const existingRelation = await this.relationRepository.findByNodes(
      input.parentNodeId,
      input.childNodeId,
    );
    if (existingRelation) {
      return existingRelation;
    }

    // Create relation
    const relation = new NetworkRelationEntity({
      id: randomUUID(),
      tenantId: input.tenantId,
      parentNodeId: input.parentNodeId,
      childNodeId: input.childNodeId,
      relationType: input.relationType || RelationType.DIRECT,
      createdAt: new Date(),
    });

    await this.relationRepository.save(relation);

    // Update child's hierarchy level
    const newLevel = await this.hierarchyValidator.calculateHierarchyLevel(
      input.tenantId,
      input.childNodeId,
    );
    const childNode = await this.nodeRepository.findById(input.childNodeId);
    if (childNode) {
      childNode.updateHierarchyLevel(newLevel);
      await this.nodeRepository.save(childNode);
    }

    return relation;
  }
}

// ============================================
// UNLINK NETWORK NODE
// ============================================

export interface UnlinkNetworkNodeInput {
  childNodeId: string;
  parentNodeId: string;
}

@Injectable()
export class UnlinkNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
    @Inject(NETWORK_RELATION_REPOSITORY)
    private readonly relationRepository: INetworkRelationRepository,
  ) {}

  async execute(input: UnlinkNetworkNodeInput): Promise<void> {
    await this.relationRepository.deleteByNodes(input.parentNodeId, input.childNodeId);

    // Reset child's hierarchy level to 0 (root)
    const childNode = await this.nodeRepository.findById(input.childNodeId);
    if (childNode) {
      childNode.updateHierarchyLevel(0);
      await this.nodeRepository.save(childNode);
    }
  }
}

// ============================================
// GET NETWORK NODE
// ============================================

@Injectable()
export class GetNetworkNodeUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(nodeId: string): Promise<NetworkNodeAggregate> {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Network node not found: ${nodeId}`);
    }
    return node;
  }
}

// ============================================
// LIST NETWORK NODES BY OWNER
// ============================================

export interface ListNetworkByOwnerInput {
  tenantId: string;
  filters?: NetworkNodeFilters;
}

@Injectable()
export class ListNetworkByOwnerUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(input: ListNetworkByOwnerInput): Promise<NetworkNodeAggregate[]> {
    return this.nodeRepository.findWithFilters(input.tenantId, input.filters || {});
  }
}

// ============================================
// GET DESCENDANTS
// ============================================

export interface GetDescendantsInput {
  tenantId: string;
  nodeId: string;
  maxDepth?: number;
}

@Injectable()
export class GetDescendantsUseCase {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  async execute(input: GetDescendantsInput): Promise<NetworkNodeAggregate[]> {
    return this.nodeRepository.findDescendants(input.tenantId, input.nodeId, input.maxDepth);
  }
}

// ============================================
// GET APPROVAL CHAIN
// ============================================

export interface GetApprovalChainInput {
  nodeId: string;
  rule?: ApprovalRule;
}

@Injectable()
export class GetApprovalChainUseCase {
  constructor(
    private readonly approvalChainCalculator: ApprovalChainCalculatorService,
  ) {}

  async execute(input: GetApprovalChainInput): Promise<ApprovalChain> {
    return this.approvalChainCalculator.calculateApprovalChain(input.nodeId, input.rule);
  }
}

// ============================================
// VALIDATE APPROVAL AUTHORITY
// ============================================

export interface ValidateApprovalAuthorityInput {
  approverNodeId: string;
  targetNodeId: string;
  rule?: ApprovalRule;
}

export interface ValidateApprovalAuthorityResult {
  approverNodeId: string;
  targetNodeId: string;
  hasAuthority: boolean;
  validatedAt: Date;
}

@Injectable()
export class ValidateApprovalAuthorityUseCase {
  constructor(
    private readonly approvalChainCalculator: ApprovalChainCalculatorService,
  ) {}

  async execute(input: ValidateApprovalAuthorityInput): Promise<ValidateApprovalAuthorityResult> {
    const hasAuthority = await this.approvalChainCalculator.validateApprovalAuthority(
      input.approverNodeId,
      input.targetNodeId,
      input.rule,
    );

    return {
      approverNodeId: input.approverNodeId,
      targetNodeId: input.targetNodeId,
      hasAuthority,
      validatedAt: new Date(),
    };
  }
}
