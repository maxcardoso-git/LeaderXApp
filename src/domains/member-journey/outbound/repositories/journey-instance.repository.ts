import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';
import {
  JourneyInstanceRepository,
  MemberJourneyInstance,
  CreateJourneyInstanceInput,
  JourneyInstanceFilters,
  PagedResult,
} from '../../domain';

@Injectable()
export class JourneyInstanceRepositoryImpl implements JourneyInstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateJourneyInstanceInput): Promise<MemberJourneyInstance> {
    const instance = await this.prisma.memberJourneyInstance.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        journeyCode: input.journeyCode,
        journeyVersion: input.journeyVersion || 'v1',
        currentState: input.initialState,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(instance);
  }

  async findById(tenantId: string, id: string): Promise<MemberJourneyInstance | null> {
    const instance = await this.prisma.memberJourneyInstance.findFirst({
      where: { id, tenantId },
    });

    return instance ? this.mapToEntity(instance) : null;
  }

  async findByMember(
    tenantId: string,
    memberId: string,
    journeyCode: string,
  ): Promise<MemberJourneyInstance | null> {
    const instance = await this.prisma.memberJourneyInstance.findUnique({
      where: {
        tenantId_memberId_journeyCode: {
          tenantId,
          memberId,
          journeyCode,
        },
      },
    });

    return instance ? this.mapToEntity(instance) : null;
  }

  async updateState(tenantId: string, id: string, newState: string): Promise<MemberJourneyInstance> {
    const instance = await this.prisma.memberJourneyInstance.update({
      where: { id },
      data: { currentState: newState },
    });

    return this.mapToEntity(instance);
  }

  async search(filters: JourneyInstanceFilters): Promise<PagedResult<MemberJourneyInstance>> {
    const {
      tenantId,
      memberId,
      journeyCode,
      currentState,
      page = 1,
      size = 25,
    } = filters;

    const where: Prisma.MemberJourneyInstanceWhereInput = {
      tenantId,
      ...(memberId && { memberId }),
      ...(journeyCode && { journeyCode }),
      ...(currentState && { currentState }),
    };

    const [items, total] = await Promise.all([
      this.prisma.memberJourneyInstance.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.memberJourneyInstance.count({ where }),
    ]);

    return {
      items: items.map(this.mapToEntity),
      total,
      page,
      size,
    };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.memberJourneyInstance.delete({
      where: { id },
    });
  }

  private mapToEntity(record: any): MemberJourneyInstance {
    return {
      id: record.id,
      tenantId: record.tenantId,
      memberId: record.memberId,
      journeyCode: record.journeyCode,
      journeyVersion: record.journeyVersion,
      currentState: record.currentState,
      metadata: record.metadata as Record<string, unknown>,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
