import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface PointsPolicyDocument {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  version: number;
  status: string;
  rules: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

@Injectable()
export class PointsPolicyHandler {
  constructor(private readonly prisma: PrismaService) {}

  async getActivePolicy(tenantId: string): Promise<PointsPolicyDocument | null> {
    const policy = await this.prisma.pointsPolicy.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
    });
    return policy ? this.toDocument(policy) : null;
  }

  async listVersions(tenantId: string): Promise<PointsPolicyDocument[]> {
    const policies = await this.prisma.pointsPolicy.findMany({
      where: { tenantId },
      orderBy: { version: 'desc' },
    });
    return policies.map((p) => this.toDocument(p));
  }

  async createVersion(
    tenantId: string,
    data: { name: string; rules: Record<string, any>; createdBy?: string },
  ): Promise<PointsPolicyDocument> {
    const latest = await this.prisma.pointsPolicy.findFirst({
      where: { tenantId, code: 'GLOBAL_POINTS_POLICY' },
      orderBy: { version: 'desc' },
    });

    const newVersion = latest ? latest.version + 1 : 1;

    const [, created] = await this.prisma.$transaction([
      this.prisma.pointsPolicy.updateMany({
        where: { tenantId, code: 'GLOBAL_POINTS_POLICY', status: 'ACTIVE' },
        data: { status: 'DEPRECATED' },
      }),
      this.prisma.pointsPolicy.create({
        data: {
          tenantId,
          code: 'GLOBAL_POINTS_POLICY',
          name: data.name,
          version: newVersion,
          status: 'ACTIVE',
          rules: data.rules,
          createdBy: data.createdBy,
        },
      }),
    ]);

    return this.toDocument(created);
  }

  async updatePolicy(
    tenantId: string,
    id: string,
    data: { name?: string; rules?: Record<string, any> },
  ): Promise<PointsPolicyDocument> {
    const updated = await this.prisma.pointsPolicy.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.rules !== undefined && { rules: data.rules }),
      },
    });

    return this.toDocument(updated);
  }

  private toDocument(policy: any): PointsPolicyDocument {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      code: policy.code,
      name: policy.name,
      version: policy.version,
      status: policy.status,
      rules: policy.rules as Record<string, any>,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      createdBy: policy.createdBy,
    };
  }
}
