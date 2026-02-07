import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface PointQuotationDocument {
  id: string;
  tenantId: string;
  value: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  description: string | null;
  reason: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PointQuotationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async getActive(tenantId: string): Promise<PointQuotationDocument | null> {
    const quotation = await this.prisma.pointQuotation.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { effectiveFrom: 'desc' },
    });
    return quotation ? this.toDocument(quotation) : null;
  }

  async list(
    tenantId: string,
    params: { page?: number; size?: number; status?: string },
  ): Promise<{ items: PointQuotationDocument[]; total: number }> {
    const page = params.page || 1;
    const size = params.size || 20;
    const where: any = { tenantId };
    if (params.status) where.status = params.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pointQuotation.findMany({
        where,
        orderBy: { effectiveFrom: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.pointQuotation.count({ where }),
    ]);

    return { items: items.map((q) => this.toDocument(q)), total };
  }

  async create(
    tenantId: string,
    data: {
      value: number;
      currency?: string;
      effectiveFrom: Date;
      description?: string;
      reason?: string;
      createdBy?: string;
    },
  ): Promise<PointQuotationDocument> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.pointQuotation.updateMany({
        where: { tenantId, status: 'ACTIVE' },
        data: { status: 'DEPRECATED', effectiveTo: new Date() },
      }),
      this.prisma.pointQuotation.create({
        data: {
          tenantId,
          value: data.value,
          currency: data.currency || 'BRL',
          effectiveFrom: data.effectiveFrom,
          description: data.description,
          reason: data.reason,
          status: 'ACTIVE',
          createdBy: data.createdBy,
        },
      }),
    ]);

    return this.toDocument(created);
  }

  async update(
    tenantId: string,
    id: string,
    data: { description?: string; reason?: string },
  ): Promise<PointQuotationDocument> {
    const updated = await this.prisma.pointQuotation.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });
    return this.toDocument(updated);
  }

  async deprecate(tenantId: string, id: string): Promise<PointQuotationDocument> {
    const updated = await this.prisma.pointQuotation.update({
      where: { id },
      data: { status: 'DEPRECATED', effectiveTo: new Date() },
    });
    return this.toDocument(updated);
  }

  private toDocument(quotation: any): PointQuotationDocument {
    return {
      id: quotation.id,
      tenantId: quotation.tenantId,
      value: quotation.value,
      currency: quotation.currency,
      effectiveFrom: quotation.effectiveFrom.toISOString(),
      effectiveTo: quotation.effectiveTo ? quotation.effectiveTo.toISOString() : null,
      description: quotation.description,
      reason: quotation.reason,
      status: quotation.status,
      createdBy: quotation.createdBy,
      createdAt: quotation.createdAt.toISOString(),
      updatedAt: quotation.updatedAt.toISOString(),
    };
  }
}
