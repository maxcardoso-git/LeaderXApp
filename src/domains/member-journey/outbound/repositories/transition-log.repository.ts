import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';
import {
  TransitionLogRepository,
  MemberJourneyTransitionLog,
  TransitionStateInput,
  TransitionLogFilters,
  PagedResult,
} from '../../domain';

@Injectable()
export class TransitionLogRepositoryImpl implements TransitionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: TransitionStateInput): Promise<MemberJourneyTransitionLog> {
    // First, get the current state from the journey instance
    const instance = await this.prisma.memberJourneyInstance.findUnique({
      where: { id: input.journeyInstanceId },
    });

    const log = await this.prisma.memberJourneyTransitionLog.create({
      data: {
        tenantId: input.tenantId,
        memberId: instance?.memberId || '',
        journeyInstanceId: input.journeyInstanceId,
        fromState: instance?.currentState || null,
        toState: input.toState,
        trigger: input.trigger,
        origin: input.origin,
        actorId: input.actorId || null,
        approvalRequestId: input.approvalRequestId || null,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(log);
  }

  async findById(tenantId: string, id: string): Promise<MemberJourneyTransitionLog | null> {
    const log = await this.prisma.memberJourneyTransitionLog.findFirst({
      where: { id, tenantId },
    });

    return log ? this.mapToEntity(log) : null;
  }

  async search(filters: TransitionLogFilters): Promise<PagedResult<MemberJourneyTransitionLog>> {
    const {
      tenantId,
      memberId,
      journeyInstanceId,
      trigger,
      origin,
      fromDate,
      toDate,
      page = 1,
      size = 25,
    } = filters;

    const where: Prisma.MemberJourneyTransitionLogWhereInput = {
      tenantId,
      ...(memberId && { memberId }),
      ...(journeyInstanceId && { journeyInstanceId }),
      ...(trigger && { trigger }),
      ...(origin && { origin }),
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.memberJourneyTransitionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.memberJourneyTransitionLog.count({ where }),
    ]);

    return {
      items: items.map(this.mapToEntity),
      total,
      page,
      size,
    };
  }

  async getLatestByInstance(
    tenantId: string,
    journeyInstanceId: string,
  ): Promise<MemberJourneyTransitionLog | null> {
    const log = await this.prisma.memberJourneyTransitionLog.findFirst({
      where: { tenantId, journeyInstanceId },
      orderBy: { createdAt: 'desc' },
    });

    return log ? this.mapToEntity(log) : null;
  }

  private mapToEntity(record: any): MemberJourneyTransitionLog {
    return {
      id: record.id,
      tenantId: record.tenantId,
      memberId: record.memberId,
      journeyInstanceId: record.journeyInstanceId,
      fromState: record.fromState,
      toState: record.toState,
      trigger: record.trigger,
      origin: record.origin,
      actorId: record.actorId,
      approvalRequestId: record.approvalRequestId,
      metadata: record.metadata as Record<string, unknown>,
      createdAt: record.createdAt,
    };
  }
}
