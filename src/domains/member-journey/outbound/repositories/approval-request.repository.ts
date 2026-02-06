import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ApprovalRequestRepository,
  MemberApprovalRequest,
  CreateApprovalRequestInput,
  ResolveApprovalInput,
  ApprovalRequestFilters,
  PagedResult,
} from '../../domain';

@Injectable()
export class ApprovalRequestRepositoryImpl implements ApprovalRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateApprovalRequestInput): Promise<MemberApprovalRequest> {
    const request = await this.prisma.memberApprovalRequest.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        journeyInstanceId: input.journeyInstanceId,
        journeyTrigger: input.journeyTrigger,
        policyCode: input.policyCode,
        status: 'PENDING',
        kanbanCardId: input.kanbanCardId || null,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(request);
  }

  async findById(tenantId: string, id: string): Promise<MemberApprovalRequest | null> {
    const request = await this.prisma.memberApprovalRequest.findFirst({
      where: { id, tenantId },
    });

    return request ? this.mapToEntity(request) : null;
  }

  async resolve(input: ResolveApprovalInput): Promise<MemberApprovalRequest> {
    const request = await this.prisma.memberApprovalRequest.update({
      where: { id: input.approvalRequestId },
      data: {
        status: input.status,
        resolvedAt: new Date(),
        resolvedBy: input.resolvedBy,
      },
    });

    return this.mapToEntity(request);
  }

  async search(filters: ApprovalRequestFilters): Promise<PagedResult<MemberApprovalRequest>> {
    const {
      tenantId,
      memberId,
      journeyInstanceId,
      status,
      policyCode,
      page = 1,
      size = 25,
    } = filters;

    const where: Prisma.MemberApprovalRequestWhereInput = {
      tenantId,
      ...(memberId && { memberId }),
      ...(journeyInstanceId && { journeyInstanceId }),
      ...(status && { status }),
      ...(policyCode && { policyCode }),
    };

    const [items, total] = await Promise.all([
      this.prisma.memberApprovalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.memberApprovalRequest.count({ where }),
    ]);

    return {
      items: items.map(this.mapToEntity),
      total,
      page,
      size,
    };
  }

  async findByKanbanCardId(tenantId: string, kanbanCardId: string): Promise<MemberApprovalRequest | null> {
    const request = await this.prisma.memberApprovalRequest.findFirst({
      where: { tenantId, kanbanCardId },
    });

    return request ? this.mapToEntity(request) : null;
  }

  async updateKanbanCardId(tenantId: string, id: string, kanbanCardId: string): Promise<void> {
    await this.prisma.memberApprovalRequest.update({
      where: { id },
      data: { kanbanCardId },
    });
  }

  async findPendingByMember(tenantId: string, memberId: string): Promise<MemberApprovalRequest[]> {
    const requests = await this.prisma.memberApprovalRequest.findMany({
      where: { tenantId, memberId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(this.mapToEntity);
  }

  private mapToEntity(record: any): MemberApprovalRequest {
    return {
      id: record.id,
      tenantId: record.tenantId,
      memberId: record.memberId,
      journeyInstanceId: record.journeyInstanceId,
      journeyTrigger: record.journeyTrigger,
      policyCode: record.policyCode,
      status: record.status,
      kanbanCardId: record.kanbanCardId,
      metadata: record.metadata as Record<string, unknown>,
      createdAt: record.createdAt,
      resolvedAt: record.resolvedAt,
      resolvedBy: record.resolvedBy,
    };
  }
}
