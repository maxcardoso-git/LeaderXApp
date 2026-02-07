import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface InvitationPolicyDocument {
  id: string;
  tenantId: string;
  eventId: string;
  allowedTypes: string[];
  maxInvitations: number;
  allowPoints: boolean;
  allowHybrid: boolean;
  allowedRoles: string[];
  expirationHours: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class InvitationPolicyHandler {
  constructor(private readonly prisma: PrismaService) {}

  async getByEvent(tenantId: string, eventId: string): Promise<InvitationPolicyDocument | null> {
    const policy = await this.prisma.invitationPolicy.findUnique({
      where: { eventId },
    });
    return policy ? this.toDocument(policy) : null;
  }

  async upsert(
    tenantId: string,
    eventId: string,
    data: {
      allowedTypes?: string[];
      maxInvitations?: number;
      allowPoints?: boolean;
      allowHybrid?: boolean;
      allowedRoles?: string[];
      expirationHours?: number;
    },
  ): Promise<InvitationPolicyDocument> {
    const policy = await this.prisma.invitationPolicy.upsert({
      where: { eventId },
      create: {
        tenantId,
        eventId,
        allowedTypes: data.allowedTypes || ['FREE', 'POINTS', 'PAID', 'HYBRID'],
        maxInvitations: data.maxInvitations ?? 100,
        allowPoints: data.allowPoints ?? true,
        allowHybrid: data.allowHybrid ?? true,
        allowedRoles: data.allowedRoles || ['ADMIN', 'ORGANIZER'],
        expirationHours: data.expirationHours ?? 72,
      },
      update: {
        ...(data.allowedTypes !== undefined && { allowedTypes: data.allowedTypes }),
        ...(data.maxInvitations !== undefined && { maxInvitations: data.maxInvitations }),
        ...(data.allowPoints !== undefined && { allowPoints: data.allowPoints }),
        ...(data.allowHybrid !== undefined && { allowHybrid: data.allowHybrid }),
        ...(data.allowedRoles !== undefined && { allowedRoles: data.allowedRoles }),
        ...(data.expirationHours !== undefined && { expirationHours: data.expirationHours }),
      },
    });
    return this.toDocument(policy);
  }

  private toDocument(policy: any): InvitationPolicyDocument {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      eventId: policy.eventId,
      allowedTypes: Array.isArray(policy.allowedTypes) ? policy.allowedTypes : JSON.parse(policy.allowedTypes),
      maxInvitations: policy.maxInvitations,
      allowPoints: policy.allowPoints,
      allowHybrid: policy.allowHybrid,
      allowedRoles: Array.isArray(policy.allowedRoles) ? policy.allowedRoles : JSON.parse(policy.allowedRoles),
      expirationHours: policy.expirationHours,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
