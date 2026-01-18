import { Injectable, Inject } from '@nestjs/common';
import { NetworkNodeAggregate } from '../aggregates';
import { NETWORK_NODE_REPOSITORY, INetworkNodeRepository } from '../ports';

export interface HierarchyValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class HierarchyValidatorService {
  constructor(
    @Inject(NETWORK_NODE_REPOSITORY)
    private readonly nodeRepository: INetworkNodeRepository,
  ) {}

  /**
   * Validates that creating a parent-child relationship won't create a cycle.
   * A cycle occurs when the child is already an ancestor of the parent.
   */
  async validateNoCycle(
    tenantId: string,
    parentNodeId: string,
    childNodeId: string,
  ): Promise<HierarchyValidationResult> {
    const errors: string[] = [];

    // Cannot link to self
    if (parentNodeId === childNodeId) {
      errors.push('A node cannot be its own parent');
      return { valid: false, errors };
    }

    // Check if child is an ancestor of parent (would create cycle)
    const ancestors = await this.getAncestors(tenantId, parentNodeId);
    if (ancestors.includes(childNodeId)) {
      errors.push('Cannot create relationship: would create a hierarchy cycle');
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validates that a node can have only one direct parent.
   */
  async validateSingleParent(
    tenantId: string,
    childNodeId: string,
    newParentNodeId: string,
  ): Promise<HierarchyValidationResult> {
    const errors: string[] = [];

    const childNode = await this.nodeRepository.findById(childNodeId);
    if (!childNode) {
      errors.push('Child node not found');
      return { valid: false, errors };
    }

    // Check if node already has a direct parent
    const existingParents = childNode.getParentNodeIds();
    if (existingParents.length > 0 && !existingParents.includes(newParentNodeId)) {
      errors.push('Node already has a parent. Remove existing parent first.');
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validates that both nodes belong to the same owner context.
   */
  async validateSameOwnerContext(
    parentNodeId: string,
    childNodeId: string,
  ): Promise<HierarchyValidationResult> {
    const errors: string[] = [];

    const parentNode = await this.nodeRepository.findById(parentNodeId);
    const childNode = await this.nodeRepository.findById(childNodeId);

    if (!parentNode || !childNode) {
      errors.push('One or both nodes not found');
      return { valid: false, errors };
    }

    if (parentNode.tenantId !== childNode.tenantId) {
      errors.push('Nodes must belong to the same tenant');
      return { valid: false, errors };
    }

    if (parentNode.ownerId !== childNode.ownerId) {
      errors.push('Nodes must belong to the same owner');
      return { valid: false, errors };
    }

    if (parentNode.ownerType !== childNode.ownerType) {
      errors.push('Nodes must have the same owner type');
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Full hierarchy validation for linking nodes.
   */
  async validateLink(
    tenantId: string,
    parentNodeId: string,
    childNodeId: string,
  ): Promise<HierarchyValidationResult> {
    const allErrors: string[] = [];

    // Validate no cycle
    const cycleResult = await this.validateNoCycle(tenantId, parentNodeId, childNodeId);
    if (!cycleResult.valid) {
      allErrors.push(...cycleResult.errors);
    }

    // Validate same owner context
    const contextResult = await this.validateSameOwnerContext(parentNodeId, childNodeId);
    if (!contextResult.valid) {
      allErrors.push(...contextResult.errors);
    }

    // Validate single parent
    const parentResult = await this.validateSingleParent(tenantId, childNodeId, parentNodeId);
    if (!parentResult.valid) {
      allErrors.push(...parentResult.errors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Gets all ancestors of a node (recursive).
   */
  async getAncestors(tenantId: string, nodeId: string): Promise<string[]> {
    const ancestors: string[] = [];
    const visited = new Set<string>();

    const traverse = async (currentId: string): Promise<void> => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const node = await this.nodeRepository.findById(currentId);
      if (!node) return;

      const parentIds = node.getParentNodeIds();
      for (const parentId of parentIds) {
        ancestors.push(parentId);
        await traverse(parentId);
      }
    };

    await traverse(nodeId);
    return ancestors;
  }

  /**
   * Calculates the hierarchy level for a node based on its ancestors.
   */
  async calculateHierarchyLevel(tenantId: string, nodeId: string): Promise<number> {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) return 0;

    const parentIds = node.getParentNodeIds();
    if (parentIds.length === 0) return 0;

    let maxParentLevel = -1;
    for (const parentId of parentIds) {
      const parentNode = await this.nodeRepository.findById(parentId);
      if (parentNode && parentNode.hierarchyLevel > maxParentLevel) {
        maxParentLevel = parentNode.hierarchyLevel;
      }
    }

    return maxParentLevel + 1;
  }
}
