import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ComplianceCheckResultEntity } from '../../domain/entities';
import { IComplianceResultRepository } from '../../domain/ports';
import { ComplianceResultStatus, EvidenceItem } from '../../domain/value-objects';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComplianceResultRepository implements IComplianceResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(result: ComplianceCheckResultEntity): Promise<void> {
    await this.prisma.complianceCheckResult.create({
      data: {
        id: result.id,
        tenantId: result.tenantId,
        checkId: result.checkId,
        checkCode: result.checkCode,
        reportId: result.reportId,
        status: result.status,
        evidence: result.evidence as unknown as Prisma.InputJsonValue,
        executedAt: result.executedAt,
        createdAt: result.createdAt,
      },
    });
  }

  async saveMany(results: ComplianceCheckResultEntity[]): Promise<void> {
    await this.prisma.complianceCheckResult.createMany({
      data: results.map((result) => ({
        id: result.id,
        tenantId: result.tenantId,
        checkId: result.checkId,
        checkCode: result.checkCode,
        reportId: result.reportId,
        status: result.status,
        evidence: result.evidence as unknown as Prisma.InputJsonValue,
        executedAt: result.executedAt,
        createdAt: result.createdAt,
      })),
    });
  }

  async findByReportId(reportId: string): Promise<ComplianceCheckResultEntity[]> {
    const records = await this.prisma.complianceCheckResult.findMany({
      where: { reportId },
      orderBy: { executedAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByCheckCode(
    tenantId: string,
    checkCode: string,
    limit = 100,
  ): Promise<ComplianceCheckResultEntity[]> {
    const records = await this.prisma.complianceCheckResult.findMany({
      where: { tenantId, checkCode },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    checkId: string;
    checkCode: string;
    reportId: string | null;
    status: string;
    evidence: Prisma.JsonValue;
    executedAt: Date;
    createdAt: Date;
  }): ComplianceCheckResultEntity {
    return new ComplianceCheckResultEntity({
      id: record.id,
      tenantId: record.tenantId,
      checkId: record.checkId,
      checkCode: record.checkCode,
      reportId: record.reportId ?? undefined,
      status: record.status as ComplianceResultStatus,
      evidence: (record.evidence as unknown as EvidenceItem[]) || [],
      executedAt: record.executedAt,
      createdAt: record.createdAt,
    });
  }
}
