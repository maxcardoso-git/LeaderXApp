export class ComplianceCheckNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Compliance check not found: ${identifier}`);
    this.name = 'ComplianceCheckNotFoundError';
  }
}

export class ComplianceReportNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Compliance report not found: ${identifier}`);
    this.name = 'ComplianceReportNotFoundError';
  }
}

export class ComplianceExecutionError extends Error {
  constructor(message: string) {
    super(`Compliance execution failed: ${message}`);
    this.name = 'ComplianceExecutionError';
  }
}
