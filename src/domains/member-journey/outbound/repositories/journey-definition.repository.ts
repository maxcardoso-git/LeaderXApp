import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  JourneyDefinitionRepository,
  MemberJourneyDefinition,
  CreateJourneyDefinitionInput,
  UpdateJourneyDefinitionInput,
} from '../../domain';

@Injectable()
export class JourneyDefinitionRepositoryImpl
  implements JourneyDefinitionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateJourneyDefinitionInput,
  ): Promise<MemberJourneyDefinition> {
    const record = await this.prisma.memberJourneyDefinition.create({
      data: {
        tenantId: input.tenantId,
        code: input.code,
        version: input.version,
        name: input.name,
        description: input.description,
        initialState: input.initialState,
        states: input.states,
        transitions: input.transitions as any,
        commands: (input.commands || []) as any,
        events: (input.events || []) as any,
      },
    });

    return this.mapToEntity(record);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<MemberJourneyDefinition | null> {
    const record = await this.prisma.memberJourneyDefinition.findFirst({
      where: { id, tenantId },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findByCode(
    tenantId: string,
    code: string,
    version?: string,
  ): Promise<MemberJourneyDefinition | null> {
    const where: any = { tenantId, code };
    if (version) {
      where.version = version;
    }

    const record = await this.prisma.memberJourneyDefinition.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findActive(
    tenantId: string,
    code: string,
  ): Promise<MemberJourneyDefinition | null> {
    const record = await this.prisma.memberJourneyDefinition.findFirst({
      where: { tenantId, code, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateJourneyDefinitionInput,
  ): Promise<MemberJourneyDefinition> {
    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.initialState !== undefined)
      data.initialState = input.initialState;
    if (input.states !== undefined) data.states = input.states;
    if (input.transitions !== undefined)
      data.transitions = input.transitions as any;
    if (input.commands !== undefined) data.commands = input.commands as any;
    if (input.events !== undefined) data.events = input.events as any;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const record = await this.prisma.memberJourneyDefinition.update({
      where: { id },
      data,
    });

    return this.mapToEntity(record);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.memberJourneyDefinition.delete({
      where: { id },
    });
  }

  async list(tenantId: string): Promise<MemberJourneyDefinition[]> {
    const records = await this.prisma.memberJourneyDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(this.mapToEntity);
  }

  private mapToEntity(record: any): MemberJourneyDefinition {
    return {
      id: record.id,
      tenantId: record.tenantId,
      code: record.code,
      version: record.version,
      name: record.name,
      description: record.description,
      initialState: record.initialState,
      states: record.states as string[],
      transitions: record.transitions as any[],
      commands: (record.commands || []) as any[],
      events: (record.events || []) as string[],
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
