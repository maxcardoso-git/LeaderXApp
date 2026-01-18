import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { NetworkNodeAggregate } from '../../domain/aggregates';
import { NetworkRelationEntity } from '../../domain/entities';
import {
  INetworkNodeRepository,
  NetworkNodeFilters,
} from '../../domain/ports';
import {
  NodeStatus,
  NodeRole,
  OwnerType,
  RelationType,
} from '../../domain/value-objects';
import { Prisma } from '@prisma/client';

type NetworkNodeWithRelations = Prisma.NetworkNodeGetPayload<{
  include: { parentRelations: true; childRelations: true };
}>;

@Injectable()
export class NetworkNodeRepository implements INetworkNodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NetworkNodeAggregate | null> {
    const record = await this.prisma.networkNode.findUnique({
      where: { id },
      include: {
        parentRelations: true,
        childRelations: true,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByOwner(
    tenantId: string,
    ownerId: string,
    ownerType: OwnerType,
  ): Promise<NetworkNodeAggregate[]> {
    const records = await this.prisma.networkNode.findMany({
      where: { tenantId, ownerId, ownerType },
      include: {
        parentRelations: true,
        childRelations: true,
      },
      orderBy: { hierarchyLevel: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByUserId(tenantId: string, userId: string): Promise<NetworkNodeAggregate[]> {
    const records = await this.prisma.networkNode.findMany({
      where: { tenantId, userId },
      include: {
        parentRelations: true,
        childRelations: true,
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findWithFilters(
    tenantId: string,
    filters: NetworkNodeFilters,
  ): Promise<NetworkNodeAggregate[]> {
    const where: Prisma.NetworkNodeWhereInput = { tenantId };

    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.ownerType) where.ownerType = filters.ownerType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.role) where.role = filters.role;

    const records = await this.prisma.networkNode.findMany({
      where,
      include: {
        parentRelations: true,
        childRelations: true,
      },
      orderBy: { hierarchyLevel: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findDescendants(
    tenantId: string,
    nodeId: string,
    maxDepth = 10,
  ): Promise<NetworkNodeAggregate[]> {
    const descendants: NetworkNodeAggregate[] = [];
    const visited = new Set<string>();

    const traverse = async (currentId: string, depth: number): Promise<void> => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const childRelations = await this.prisma.networkRelation.findMany({
        where: { tenantId, parentNodeId: currentId },
      });

      for (const relation of childRelations) {
        const childNode = await this.findById(relation.childNodeId);
        if (childNode && !visited.has(childNode.id)) {
          descendants.push(childNode);
          await traverse(childNode.id, depth + 1);
        }
      }
    };

    await traverse(nodeId, 0);
    return descendants;
  }

  async findAncestors(tenantId: string, nodeId: string): Promise<NetworkNodeAggregate[]> {
    const ancestors: NetworkNodeAggregate[] = [];
    const visited = new Set<string>();

    const traverse = async (currentId: string): Promise<void> => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const parentRelations = await this.prisma.networkRelation.findMany({
        where: { tenantId, childNodeId: currentId },
      });

      for (const relation of parentRelations) {
        const parentNode = await this.findById(relation.parentNodeId);
        if (parentNode && !visited.has(parentNode.id)) {
          ancestors.push(parentNode);
          await traverse(parentNode.id);
        }
      }
    };

    await traverse(nodeId);
    return ancestors;
  }

  async save(node: NetworkNodeAggregate): Promise<void> {
    await this.prisma.networkNode.upsert({
      where: { id: node.id },
      create: {
        id: node.id,
        tenantId: node.tenantId,
        ownerId: node.ownerId,
        ownerType: node.ownerType,
        userId: node.userId,
        role: node.role,
        status: node.status,
        hierarchyLevel: node.hierarchyLevel,
        metadata: node.metadata as Prisma.InputJsonValue,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      },
      update: {
        role: node.role,
        status: node.status,
        hierarchyLevel: node.hierarchyLevel,
        metadata: node.metadata as Prisma.InputJsonValue,
        updatedAt: node.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.networkNode.delete({
      where: { id },
    });
  }

  private toDomain(record: NetworkNodeWithRelations): NetworkNodeAggregate {
    const parentRelations = record.parentRelations.map(
      (r) =>
        new NetworkRelationEntity({
          id: r.id,
          tenantId: r.tenantId,
          parentNodeId: r.parentNodeId,
          childNodeId: r.childNodeId,
          relationType: r.relationType as RelationType,
          createdAt: r.createdAt,
        }),
    );

    const childRelations = record.childRelations.map(
      (r) =>
        new NetworkRelationEntity({
          id: r.id,
          tenantId: r.tenantId,
          parentNodeId: r.parentNodeId,
          childNodeId: r.childNodeId,
          relationType: r.relationType as RelationType,
          createdAt: r.createdAt,
        }),
    );

    return new NetworkNodeAggregate({
      id: record.id,
      tenantId: record.tenantId,
      ownerId: record.ownerId,
      ownerType: record.ownerType as OwnerType,
      userId: record.userId ?? undefined,
      role: record.role as NodeRole,
      status: record.status as NodeStatus,
      hierarchyLevel: record.hierarchyLevel,
      metadata: record.metadata as Record<string, unknown> | undefined,
      parentRelations,
      childRelations,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
