import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { NetworkRelationEntity } from '../../domain/entities';
import { INetworkRelationRepository } from '../../domain/ports';
import { RelationType } from '../../domain/value-objects';

@Injectable()
export class NetworkRelationRepository implements INetworkRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NetworkRelationEntity | null> {
    const record = await this.prisma.networkRelation.findUnique({
      where: { id },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByParentNodeId(
    tenantId: string,
    parentNodeId: string,
  ): Promise<NetworkRelationEntity[]> {
    const records = await this.prisma.networkRelation.findMany({
      where: { tenantId, parentNodeId },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByChildNodeId(
    tenantId: string,
    childNodeId: string,
  ): Promise<NetworkRelationEntity[]> {
    const records = await this.prisma.networkRelation.findMany({
      where: { tenantId, childNodeId },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByNodes(
    parentNodeId: string,
    childNodeId: string,
  ): Promise<NetworkRelationEntity | null> {
    const record = await this.prisma.networkRelation.findUnique({
      where: {
        parentNodeId_childNodeId: {
          parentNodeId,
          childNodeId,
        },
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async save(relation: NetworkRelationEntity): Promise<void> {
    await this.prisma.networkRelation.upsert({
      where: { id: relation.id },
      create: {
        id: relation.id,
        tenantId: relation.tenantId,
        parentNodeId: relation.parentNodeId,
        childNodeId: relation.childNodeId,
        relationType: relation.relationType,
        createdAt: relation.createdAt,
      },
      update: {
        relationType: relation.relationType,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.networkRelation.delete({
      where: { id },
    });
  }

  async deleteByNodes(parentNodeId: string, childNodeId: string): Promise<void> {
    await this.prisma.networkRelation.delete({
      where: {
        parentNodeId_childNodeId: {
          parentNodeId,
          childNodeId,
        },
      },
    });
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    parentNodeId: string;
    childNodeId: string;
    relationType: string;
    createdAt: Date;
  }): NetworkRelationEntity {
    return new NetworkRelationEntity({
      id: record.id,
      tenantId: record.tenantId,
      parentNodeId: record.parentNodeId,
      childNodeId: record.childNodeId,
      relationType: record.relationType as RelationType,
      createdAt: record.createdAt,
    });
  }
}
