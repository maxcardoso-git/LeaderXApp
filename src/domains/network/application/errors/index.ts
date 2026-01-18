export class NetworkNodeNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Network node not found: ${identifier}`);
    this.name = 'NetworkNodeNotFoundError';
  }
}

export class NetworkRelationNotFoundError extends Error {
  constructor(parentId: string, childId: string) {
    super(`Network relation not found between ${parentId} and ${childId}`);
    this.name = 'NetworkRelationNotFoundError';
  }
}

export class HierarchyValidationError extends Error {
  constructor(errors: string[]) {
    super(`Hierarchy validation failed: ${errors.join(', ')}`);
    this.name = 'HierarchyValidationError';
  }
}

export class InsufficientAuthorityError extends Error {
  constructor(approverNodeId: string, targetNodeId: string) {
    super(`Node ${approverNodeId} does not have authority over ${targetNodeId}`);
    this.name = 'InsufficientAuthorityError';
  }
}
