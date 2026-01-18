import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ComplianceCheckAggregate } from '../../domain/aggregates';
import { IComplianceCheckRepository } from '../../domain/ports';
import { ComplianceSeverity, ComplianceRules } from '../../domain/value-objects';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComplianceCheckRepository implements IComplianceCheckRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ComplianceCheckAggregate | null> {
    const record = await this.prisma.complianceCheck.findUnique({
      where: { id },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCode(code: string): Promise<ComplianceCheckAggregate | null> {
    const record = await this.prisma.complianceCheck.findUnique({
      where: { code },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(tenantId?: string): Promise<ComplianceCheckAggregate[]> {
    const records = await this.prisma.complianceCheck.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findAllEnabled(tenantId?: string): Promise<ComplianceCheckAggregate[]> {
    const records = await this.prisma.complianceCheck.findMany({
      where: {
        enabled: true,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async save(check: ComplianceCheckAggregate): Promise<void> {
    await this.prisma.complianceCheck.upsert({
      where: { id: check.id },
      create: {
        id: check.id,
        tenantId: check.tenantId,
        code: check.code,
        name: check.name,
        description: check.description,
        severity: check.severity,
        rules: check.rules as unknown as Prisma.InputJsonValue,
        enabled: check.enabled,
        createdAt: check.createdAt,
        updatedAt: check.updatedAt,
      },
      update: {
        name: check.name,
        description: check.description,
        severity: check.severity,
        rules: check.rules as unknown as Prisma.InputJsonValue,
        enabled: check.enabled,
        updatedAt: check.updatedAt,
      },
    });
  }

  private toDomain(record: {
    id: string;
    tenantId: string | null;
    code: string;
    name: string;
    description: string | null;
    severity: string;
    rules: Prisma.JsonValue;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ComplianceCheckAggregate {
    return new ComplianceCheckAggregate({
      id: record.id,
      tenantId: record.tenantId ?? undefined,
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      severity: record.severity as ComplianceSeverity,
      rules: record.rules as unknown as ComplianceRules,
      enabled: record.enabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
