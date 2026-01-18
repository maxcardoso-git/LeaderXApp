import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { IdentityReadPort, ActorInfo } from '../../domain/ports';

@Injectable()
export class IdentityReadAdapter implements IdentityReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async getActorInfo(tenantId: string, actorId: string): Promise<ActorInfo | null> {
    // Get user with their role assignments
    const user = await this.prisma.identityUser.findFirst({
      where: { tenantId, id: actorId },
    });

    if (!user) {
      return null;
    }

    // Get active role assignments
    const assignments = await this.prisma.accessAssignment.findMany({
      where: {
        tenantId,
        userId: actorId,
        status: 'ACTIVE',
      },
      include: {
        role: true,
      },
    });

    const roles = assignments.map((a) => a.role.code);

    return {
      actorId,
      roles,
      tenantId,
    };
  }
}
