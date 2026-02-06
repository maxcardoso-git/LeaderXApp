import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { GovernancePolicyPort, GovernancePolicyInfo } from '../../domain';

@Injectable()
export class GovernancePolicyAdapter implements GovernancePolicyPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<GovernancePolicyInfo | null> {
    const policy = await this.prisma.govApprovalPolicy.findUnique({
      where: { code },
    });

    if (!policy || !policy.enabled) {
      return null;
    }

    return {
      id: policy.id,
      code: policy.code,
      pipelineId: policy.pipelineId,
      blocking: policy.blocking,
    };
  }
}
