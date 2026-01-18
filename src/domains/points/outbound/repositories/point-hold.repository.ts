import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  PointHold,
  Reference,
  HoldStatus,
  PointHoldRepositoryPort,
  TransactionContext,
} from '../../domain';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PointHoldRepository implements PointHoldRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return ctx?.tx as PrismaClient ?? this.prisma;
  }

  async findActiveHoldByReference(
    tenantId: string,
    accountId: string,
    referenceType: string,
    referenceId: string,
    ctx?: TransactionContext,
  ): Promise<PointHold | null> {
    const client = this.getClient(ctx);

    const record = await client.pointHold.findFirst({
      where: {
        tenantId,
        accountId,
        referenceType,
        referenceId,
        status: HoldStatus.ACTIVE,
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findHoldByReference(
    tenantId: string,
    accountId: string,
    referenceType: string,
    referenceId: string,
    ctx?: TransactionContext,
  ): Promise<PointHold | null> {
    const client = this.getClient(ctx);

    const record = await client.pointHold.findUnique({
      where: {
        tenantId_accountId_referenceType_referenceId: {
          tenantId,
          accountId,
          referenceType,
          referenceId,
        },
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async create(hold: PointHold, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointHold.create({
      data: {
        id: hold.id,
        tenantId: hold.tenantId,
        accountId: hold.accountId,
        referenceType: hold.referenceType,
        referenceId: hold.referenceId,
        amount: hold.amount,
        status: hold.status,
        expiresAt: hold.expiresAt,
        createdAt: hold.createdAt,
        updatedAt: hold.updatedAt,
      },
    });
  }

  async updateStatus(hold: PointHold, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointHold.update({
      where: { id: hold.id },
      data: {
        status: hold.status,
        updatedAt: hold.updatedAt,
      },
    });
  }

  async getActiveHoldsTotal(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<number> {
    const client = this.getClient(ctx);

    const result = await client.pointHold.aggregate({
      where: {
        tenantId,
        accountId,
        status: HoldStatus.ACTIVE,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ?? 0;
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    accountId: string;
    referenceType: string;
    referenceId: string;
    amount: number;
    status: string;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PointHold {
    return PointHold.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      accountId: record.accountId,
      reference: Reference.create(record.referenceType, record.referenceId),
      amount: record.amount,
      status: record.status as HoldStatus,
      expiresAt: record.expiresAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
