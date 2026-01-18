export class PolicyNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Policy not found: ${identifier}`);
    this.name = 'PolicyNotFoundError';
  }
}

export class PolicyCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Policy code already exists: ${code}`);
    this.name = 'PolicyCodeAlreadyExistsError';
  }
}

export class PolicyCannotBeModifiedError extends Error {
  constructor(policyId: string, reason: string) {
    super(`Policy ${policyId} cannot be modified: ${reason}`);
    this.name = 'PolicyCannotBeModifiedError';
  }
}

export class GovernanceDeniedError extends Error {
  constructor(reasons: string[]) {
    super(`Governance denied: ${reasons.join('; ')}`);
    this.name = 'GovernanceDeniedError';
  }
}
