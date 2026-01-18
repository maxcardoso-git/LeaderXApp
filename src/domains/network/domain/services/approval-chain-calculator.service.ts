import { Injectable, Inject } from '@nestjs/common';
import { NetworkNodeAggregate } from '../aggregates';
import {
  ApprovalRule,
  ApprovalChain,
  ApprovalChainNode,
  NodeRole,
  NodeStatus,
  ROLE_HIERARCHY,
} from '../value-objects';
import { NETWORK_NODE_REPOSITORY, INetworkNodeRepository } from '../ports';

const DEFAULT_APPROVAL_RULE: ApprovalRule = {
  minApprovers: 1,
  allowedRoles: [NodeRole.OWNER, NodeRole.ADMIN, NodeRole.EMBAIXADOR],
  maxDepth: 10,
};

@Injectable()
export class ApprovalChainCalculatorService {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  /**
   * Calculates the approval chain for a given node.
   * The chain includes all ancestors who can approve based on the rule.
   */
  async calculateApprovalChain(
    nodeId: string,
    rule: ApprovalRule = DEFAULT_APPROVAL_RULE,
  ): Promise<ApprovalChain> {
    const targetNode = await this.nodeRepository.findById(nodeId);
    if (!targetNode) {
      return {
        targetNodeId: nodeId,
        chain: [],
        calculatedAt: new Date(),
      };
    }

    const chain: ApprovalChainNode[] = [];
    const visited = new Set<string>();
    let depth = 0;

    await this.traverseAncestors(
      targetNode,
      rule,
      chain,
      visited,
      depth,
    );

    // Sort by hierarchy level (closest first) and then by role
    chain.sort((a, b) => {
      if (a.hierarchyLevel !== b.hierarchyLevel) {
        return a.hierarchyLevel - b.hierarchyLevel;
      }
      return ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role];
    });

    return {
      targetNodeId: nodeId,
      chain,
      calculatedAt: new Date(),
    };
  }

  private async traverseAncestors(
    currentNode: NetworkNodeAggregate,
    rule: ApprovalRule,
    chain: ApprovalChainNode[],
    visited: Set<string>,
    depth: number,
  ): Promise<void> {
    if (depth >= rule.maxDepth) return;

    const parentIds = currentNode.getParentNodeIds();

    for (const parentId of parentIds) {
      if (visited.has(parentId)) continue;
      visited.add(parentId);

      const parentNode = await this.nodeRepository.findById(parentId);
      if (!parentNode) continue;

      // Check if this node can approve
      const canApprove =
        parentNode.status === NodeStatus.ACTIVE &&
        rule.allowedRoles.includes(parentNode.role);

      chain.push({
        nodeId: parentNode.id,
        userId: parentNode.userId,
        role: parentNode.role,
        hierarchyLevel: parentNode.hierarchyLevel,
        canApprove,
      });

      // Continue traversing
      await this.traverseAncestors(parentNode, rule, chain, visited, depth + 1);
    }
  }

  /**
   * Validates if a node has authority to approve for a target node.
   */
  async validateApprovalAuthority(
    approverNodeId: string,
    targetNodeId: string,
    rule: ApprovalRule = DEFAULT_APPROVAL_RULE,
  ): Promise<boolean> {
    const chain = await this.calculateApprovalChain(targetNodeId, rule);

    // Check if approver is in the chain and can approve
    const approverInChain = chain.chain.find(
      (node) => node.nodeId === approverNodeId && node.canApprove,
    );

    return !!approverInChain;
  }

  /**
   * Gets all nodes that can approve for a target node.
   */
  async getApprovers(
    nodeId: string,
    rule: ApprovalRule = DEFAULT_APPROVAL_RULE,
  ): Promise<ApprovalChainNode[]> {
    const chain = await this.calculateApprovalChain(nodeId, rule);
    return chain.chain.filter((node) => node.canApprove);
  }

  /**
   * Checks if there are enough approvers available.
   */
  async hasEnoughApprovers(
    nodeId: string,
    rule: ApprovalRule = DEFAULT_APPROVAL_RULE,
  ): Promise<boolean> {
    const approvers = await this.getApprovers(nodeId, rule);
    return approvers.length >= rule.minApprovers;
  }
}
