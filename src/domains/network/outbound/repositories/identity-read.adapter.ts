import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { IIdentityReadPort, UserInfo } from '../../domain/ports';

@Injectable()
export class IdentityReadAdapter implements IIdentityReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(userId: string): Promise<UserInfo | null> {
    const record = await this.prisma.identityUser.findUnique({
      where: { id: userId },
    });

    if (!record) return null;

    return {
      id: record.id,
      tenantId: record.tenantId,
      email: record.email ?? undefined,
      fullName: record.fullName ?? undefined,
      status: record.status,
    };
  }

  async getUsersByTenant(tenantId: string): Promise<UserInfo[]> {
    const records = await this.prisma.identityUser.findMany({
      where: { tenantId },
    });

    return records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      email: r.email ?? undefined,
      fullName: r.fullName ?? undefined,
      status: r.status,
    }));
  }
}
