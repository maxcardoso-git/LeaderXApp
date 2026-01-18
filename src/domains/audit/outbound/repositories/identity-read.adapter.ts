import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  IIdentityReadPort,
  IdentitySummary,
  AccessAssignmentRecord,
} from '../../domain/ports';

@Injectable()
export class IdentityReadAdapter implements IIdentityReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessSummary(tenantId: string): Promise<IdentitySummary | null> {
    const [totalUsers, activeUsers, totalRoles, totalPermissions] = await Promise.all([
      this.prisma.identityUser.count({
        where: { tenantId },
      }),
      this.prisma.identityUser.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      this.prisma.role.count({
        where: { tenantId },
      }),
      this.prisma.permission.count({
        where: { tenantId },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalRoles,
      totalPermissions,
    };
  }

  async getRecentAssignments(tenantId: string, limit: number): Promise<AccessAssignmentRecord[]> {
    const records = await this.prisma.accessAssignment.findMany({
      where: { tenantId },
      orderBy: { assignedAt: 'desc' },
      take: limit,
      include: {
        role: {
          select: { code: true },
        },
      },
    });

    return records.map((r) => ({
      userId: r.userId,
      roleCode: r.role.code,
      scopeType: r.scopeType,
      assignedAt: r.assignedAt,
    }));
  }
}
