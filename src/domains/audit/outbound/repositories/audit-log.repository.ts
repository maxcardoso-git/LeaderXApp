import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditLogFilters {
  tenantId: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  size?: number;
}

export interface PagedAuditLogs {
  items: any[];
  total: number;
  page: number;
  size: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: AuditLogFilters): Promise<PagedAuditLogs> {
    const {
      tenantId,
      resourceType,
      resourceId,
      actorId,
      action,
      from,
      to,
      q,
      page = 1,
      size = 25,
    } = filters;

    // Convert to numbers if they come as strings from query params
    const pageNum = Number(page);
    const sizeNum = Number(size);

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(resourceType && { resourceType }),
      ...(resourceId && { resourceId }),
      ...(actorId && { actorId }),
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(from && { timestamp: { gte: new Date(from) } }),
      ...(to && { timestamp: { lte: new Date(to) } }),
      ...(q && {
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { resourceType: { contains: q, mode: 'insensitive' } },
          { resourceId: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * sizeNum,
        take: sizeNum,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      size: sizeNum,
    };
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  async create(data: {
    tenantId: string;
    orgId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    actorId: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }): Promise<any> {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        orgId: data.orgId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        actorId: data.actorId,
        correlationId: data.correlationId,
        metadata: data.metadata as Prisma.InputJsonValue,
        timestamp: data.timestamp,
      },
    });
  }
}
