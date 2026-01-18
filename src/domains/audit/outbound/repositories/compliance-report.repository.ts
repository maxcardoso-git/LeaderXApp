import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ComplianceReportAggregate } from '../../domain/aggregates';
import { ComplianceCheckResultEntity } from '../../domain/entities';
import { IComplianceReportRepository } from '../../domain/ports';
import { ComplianceSummary, ComplianceResultStatus, EvidenceItem } from '../../domain/value-objects';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComplianceReportRepository implements IComplianceReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ComplianceReportAggregate | null> {
    const record = await this.prisma.complianceReport.findUnique({
      where: { id },
      include: {
        results: true,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findLatest(tenantId: string): Promise<ComplianceReportAggregate | null> {
    const record = await this.prisma.complianceReport.findFirst({
      where: { tenantId },
      orderBy: { generatedAt: 'desc' },
      include: {
        results: true,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(tenantId: string, limit = 50): Promise<ComplianceReportAggregate[]> {
    const records = await this.prisma.complianceReport.findMany({
      where: { tenantId },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      include: {
        results: true,
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async save(report: ComplianceReportAggregate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Create report
      await tx.complianceReport.create({
        data: {
          id: report.id,
          tenantId: report.tenantId,
          summary: report.summary as unknown as Prisma.InputJsonValue,
          generatedAt: report.generatedAt,
          createdAt: report.createdAt,
        },
      });

      // Update results with reportId
      if (report.results.length > 0) {
        const resultIds = report.results.map((r) => r.id);
        await tx.complianceCheckResult.updateMany({
          where: { id: { in: resultIds } },
          data: { reportId: report.id },
        });
      }
    });
  }

  private toDomain(
    record: {
      id: string;
      tenantId: string;
      summary: Prisma.JsonValue;
      generatedAt: Date;
      createdAt: Date;
      results: Array<{
        id: string;
        tenantId: string;
        checkId: string;
        checkCode: string;
        reportId: string | null;
        status: string;
        evidence: Prisma.JsonValue;
        executedAt: Date;
        createdAt: Date;
      }>;
    },
  ): ComplianceReportAggregate {
    const results = record.results.map(
      (r) =>
        new ComplianceCheckResultEntity({
          id: r.id,
          tenantId: r.tenantId,
          checkId: r.checkId,
          checkCode: r.checkCode,
          reportId: r.reportId ?? undefined,
          status: r.status as ComplianceResultStatus,
          evidence: (r.evidence as unknown as EvidenceItem[]) || [],
          executedAt: r.executedAt,
          createdAt: r.createdAt,
        }),
    );

    return new ComplianceReportAggregate({
      id: record.id,
      tenantId: record.tenantId,
      summary: record.summary as unknown as ComplianceSummary,
      results,
      generatedAt: record.generatedAt,
      createdAt: record.createdAt,
    });
  }
}
