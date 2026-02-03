import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ComplianceCheckAggregate, ComplianceReportAggregate } from '../../domain/aggregates';
import { ComplianceCheckResultEntity } from '../../domain/entities';
import {
  COMPLIANCE_CHECK_REPOSITORY,
  COMPLIANCE_RESULT_REPOSITORY,
  COMPLIANCE_REPORT_REPOSITORY,
  IComplianceCheckRepository,
  IComplianceResultRepository,
  IComplianceReportRepository,
} from '../../domain/ports';
import { ComplianceEvaluatorService, ComplianceExecutionResult } from '../../domain/services';
import { ComplianceEvaluationContext } from '../../domain/value-objects';
import { AuditLogRepository } from '../../outbound/repositories';

// ============================================
// LIST COMPLIANCE CHECKS
// ============================================

export interface ListComplianceChecksInput {
  tenantId?: string;
  enabled?: boolean;
  severity?: string;
}

@Injectable()
export class ListComplianceChecksUseCase {
  constructor(
    @Inject(COMPLIANCE_CHECK_REPOSITORY)
    private readonly checkRepository: IComplianceCheckRepository,
  ) {}

  async execute(input: ListComplianceChecksInput): Promise<ComplianceCheckAggregate[]> {
    let checks = await this.checkRepository.findAll(input.tenantId);

    if (input.enabled !== undefined) {
      checks = checks.filter((c) => c.enabled === input.enabled);
    }

    if (input.severity) {
      checks = checks.filter((c) => c.severity === input.severity);
    }

    return checks;
  }
}

// ============================================
// RUN COMPLIANCE CHECKS
// ============================================

export interface RunComplianceChecksInput {
  tenantId: string;
  actorId?: string;
  checkCodes?: string[];
  targetDomain?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RunComplianceChecksUseCase {
  constructor(
    private readonly evaluator: ComplianceEvaluatorService,
    @Inject(COMPLIANCE_RESULT_REPOSITORY)
    private readonly resultRepository: IComplianceResultRepository,
  ) {}

  async execute(input: RunComplianceChecksInput): Promise<ComplianceExecutionResult> {
    const context: ComplianceEvaluationContext = {
      tenantId: input.tenantId,
      actorId: input.actorId,
      targetDomain: input.targetDomain,
      targetResourceType: input.targetResourceType,
      targetResourceId: input.targetResourceId,
      metadata: input.metadata,
    };

    let result: ComplianceExecutionResult;

    if (input.checkCodes && input.checkCodes.length > 0) {
      result = await this.evaluator.executeChecksByCodes(context, input.checkCodes);
    } else {
      result = await this.evaluator.executeAllChecks(context);
    }

    // Persist results
    if (result.results.length > 0) {
      await this.resultRepository.saveMany(result.results);
    }

    return result;
  }
}

// ============================================
// GENERATE COMPLIANCE REPORT
// ============================================

export interface GenerateComplianceReportInput {
  tenantId: string;
  actorId?: string;
  runChecksFirst?: boolean;
}

@Injectable()
export class GenerateComplianceReportUseCase {
  constructor(
    private readonly runChecks: RunComplianceChecksUseCase,
    @Inject(COMPLIANCE_REPORT_REPOSITORY)
    private readonly reportRepository: IComplianceReportRepository,
  ) {}

  async execute(input: GenerateComplianceReportInput): Promise<ComplianceReportAggregate> {
    let results: ComplianceCheckResultEntity[] = [];

    if (input.runChecksFirst !== false) {
      // Run compliance checks first
      const executionResult = await this.runChecks.execute({
        tenantId: input.tenantId,
        actorId: input.actorId,
      });
      results = executionResult.results;
    }

    // Create report from results
    const report = ComplianceReportAggregate.createFromResults(
      randomUUID(),
      input.tenantId,
      results,
    );

    // Persist report
    await this.reportRepository.save(report);

    return report;
  }
}

// ============================================
// GET LATEST COMPLIANCE REPORT
// ============================================

@Injectable()
export class GetLatestComplianceReportUseCase {
  constructor(
    @Inject(COMPLIANCE_REPORT_REPOSITORY)
    private readonly reportRepository: IComplianceReportRepository,
  ) {}

  async execute(tenantId: string): Promise<ComplianceReportAggregate> {
    const report = await this.reportRepository.findLatest(tenantId);

    if (!report) {
      throw new NotFoundException(`No compliance reports found for tenant ${tenantId}`);
    }

    return report;
  }
}

// ============================================
// GET COMPLIANCE REPORT BY ID
// ============================================

@Injectable()
export class GetComplianceReportByIdUseCase {
  constructor(
    @Inject(COMPLIANCE_REPORT_REPOSITORY)
    private readonly reportRepository: IComplianceReportRepository,
  ) {}

  async execute(reportId: string): Promise<ComplianceReportAggregate> {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Compliance report not found: ${reportId}`);
    }

    return report;
  }
}

// ============================================
// SEARCH AUDIT LOGS
// ============================================

export interface SearchAuditLogsInput {
  tenantId: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  size?: number;
}

@Injectable()
export class SearchAuditLogsUseCase {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: SearchAuditLogsInput): Promise<any> {
    return this.auditLogRepository.search(input);
  }
}

// ============================================
// GET AUDIT LOG BY ID
// ============================================

@Injectable()
export class GetAuditLogByIdUseCase {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(id: string): Promise<any> {
    const log = await this.auditLogRepository.findById(id);

    if (!log) {
      throw new NotFoundException(`Audit log not found: ${id}`);
    }

    return log;
  }
}
