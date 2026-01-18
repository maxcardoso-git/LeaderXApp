import { ComplianceSummary, ComplianceResultStatus } from '../value-objects';
import { ComplianceCheckResultEntity } from '../entities';

export interface ComplianceReportProps {
  id: string;
  tenantId: string;
  summary: ComplianceSummary;
  results: ComplianceCheckResultEntity[];
  generatedAt: Date;
  createdAt: Date;
}

export class ComplianceReportAggregate {
  readonly id: string;
  readonly tenantId: string;
  readonly summary: ComplianceSummary;
  readonly results: ComplianceCheckResultEntity[];
  readonly generatedAt: Date;
  readonly createdAt: Date;

  constructor(props: ComplianceReportProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.summary = props.summary;
    this.results = props.results;
    this.generatedAt = props.generatedAt;
    this.createdAt = props.createdAt;
  }

  /**
   * Creates a new compliance report from a list of check results.
   * Reports are immutable once generated.
   */
  static createFromResults(
    id: string,
    tenantId: string,
    results: ComplianceCheckResultEntity[],
  ): ComplianceReportAggregate {
    const summary = ComplianceReportAggregate.calculateSummary(results);
    const now = new Date();

    return new ComplianceReportAggregate({
      id,
      tenantId,
      summary,
      results,
      generatedAt: now,
      createdAt: now,
    });
  }

  private static calculateSummary(results: ComplianceCheckResultEntity[]): ComplianceSummary {
    const totalChecks = results.length;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const result of results) {
      switch (result.status) {
        case ComplianceResultStatus.PASS:
          passed++;
          break;
        case ComplianceResultStatus.FAIL:
          failed++;
          break;
        case ComplianceResultStatus.WARNING:
          warnings++;
          break;
      }
    }

    return {
      totalChecks,
      passed,
      failed,
      warnings,
    };
  }

  /**
   * Check if the compliance report has any failures.
   */
  hasFailures(): boolean {
    return this.summary.failed > 0;
  }

  /**
   * Check if the compliance report is fully compliant (no failures or warnings).
   */
  isFullyCompliant(): boolean {
    return this.summary.failed === 0 && this.summary.warnings === 0;
  }

  /**
   * Get results by status.
   */
  getResultsByStatus(status: ComplianceResultStatus): ComplianceCheckResultEntity[] {
    return this.results.filter((r) => r.status === status);
  }

  /**
   * Get failed results.
   */
  getFailedResults(): ComplianceCheckResultEntity[] {
    return this.getResultsByStatus(ComplianceResultStatus.FAIL);
  }

  /**
   * Get warning results.
   */
  getWarningResults(): ComplianceCheckResultEntity[] {
    return this.getResultsByStatus(ComplianceResultStatus.WARNING);
  }
}
