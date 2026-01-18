import { Injectable, Inject } from '@nestjs/common';
import { ComplianceCheckAggregate, ComplianceCheckEvaluationResult } from '../aggregates';
import { ComplianceCheckResultEntity } from '../entities';
import {
  ComplianceResultStatus,
  ComplianceEvaluationContext,
  EvidenceItem,
} from '../value-objects';
import { COMPLIANCE_CHECK_REPOSITORY, IComplianceCheckRepository } from '../ports';
import { EvidenceCollectorService } from './evidence-collector.service';
import { randomUUID } from 'crypto';

export interface ComplianceExecutionResult {
  results: ComplianceCheckResultEntity[];
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
}

@Injectable()
export class ComplianceEvaluatorService {
  constructor(
    @Inject(COMPLIANCE_CHECK_REPOSITORY)
    private readonly checkRepository: IComplianceCheckRepository,
    private readonly evidenceCollector: EvidenceCollectorService,
  ) {}

  /**
   * Executes all enabled compliance checks for the given context.
   * Returns deterministic results for the same inputs.
   */
  async executeAllChecks(context: ComplianceEvaluationContext): Promise<ComplianceExecutionResult> {
    const checks = await this.checkRepository.findAllEnabled(context.tenantId);
    const results: ComplianceCheckResultEntity[] = [];

    // Collect evidence from all integrated domains
    const collectedEvidence = await this.evidenceCollector.collectAll(context);

    for (const check of checks) {
      const evaluationResult = this.evaluateCheck(check, collectedEvidence);

      const resultEntity = new ComplianceCheckResultEntity({
        id: randomUUID(),
        tenantId: context.tenantId,
        checkId: check.id,
        checkCode: check.code,
        status: evaluationResult.status,
        evidence: evaluationResult.evidence,
        executedAt: evaluationResult.executedAt,
        createdAt: new Date(),
      });

      results.push(resultEntity);
    }

    return this.summarizeResults(results);
  }

  /**
   * Executes specific compliance checks by codes.
   */
  async executeChecksByCodes(
    context: ComplianceEvaluationContext,
    checkCodes: string[],
  ): Promise<ComplianceExecutionResult> {
    const checks: ComplianceCheckAggregate[] = [];

    for (const code of checkCodes) {
      const check = await this.checkRepository.findByCode(code);
      if (check && check.enabled) {
        checks.push(check);
      }
    }

    const collectedEvidence = await this.evidenceCollector.collectAll(context);
    const results: ComplianceCheckResultEntity[] = [];

    for (const check of checks) {
      const evaluationResult = this.evaluateCheck(check, collectedEvidence);

      const resultEntity = new ComplianceCheckResultEntity({
        id: randomUUID(),
        tenantId: context.tenantId,
        checkId: check.id,
        checkCode: check.code,
        status: evaluationResult.status,
        evidence: evaluationResult.evidence,
        executedAt: evaluationResult.executedAt,
        createdAt: new Date(),
      });

      results.push(resultEntity);
    }

    return this.summarizeResults(results);
  }

  private evaluateCheck(
    check: ComplianceCheckAggregate,
    evidence: Record<string, unknown>,
  ): ComplianceCheckEvaluationResult {
    return check.evaluate(evidence);
  }

  private summarizeResults(results: ComplianceCheckResultEntity[]): ComplianceExecutionResult {
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
      results,
      totalChecks: results.length,
      passed,
      failed,
      warnings,
    };
  }
}
