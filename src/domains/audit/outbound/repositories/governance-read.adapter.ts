import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  IGovernanceReadPort,
  GovernanceSummary,
  GovernanceEvaluation,
} from '../../domain/ports';

@Injectable()
export class GovernanceReadAdapter implements IGovernanceReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getComplianceSummary(tenantId: string): Promise<GovernanceSummary | null> {
    const [total, active, deprecated] = await Promise.all([
      this.prisma.governancePolicy.count({
        where: { OR: [{ tenantId }, { tenantId: null }] },
      }),
      this.prisma.governancePolicy.count({
        where: {
          status: 'ACTIVE',
          OR: [{ tenantId }, { tenantId: null }],
        },
      }),
      this.prisma.governancePolicy.count({
        where: {
          status: 'DEPRECATED',
          OR: [{ tenantId }, { tenantId: null }],
        },
      }),
    ]);

    return {
      totalPolicies: total,
      activePolicies: active,
      deprecatedPolicies: deprecated,
    };
  }

  async getRecentEvaluations(tenantId: string, limit: number): Promise<GovernanceEvaluation[]> {
    const records = await this.prisma.governanceAuditLog.findMany({
      where: { tenantId },
      orderBy: { evaluatedAt: 'desc' },
      take: limit,
      select: {
        policyCode: true,
        decision: true,
        evaluatedAt: true,
      },
    });

    return records.map((r) => ({
      policyCode: r.policyCode,
      decision: r.decision,
      evaluatedAt: r.evaluatedAt,
    }));
  }
}
