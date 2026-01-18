import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  PointAccount,
  AccountOwner,
  AccountStatus,
  OwnerType,
  PointAccountRepositoryPort,
  FindAccountFilter,
  TransactionContext,
} from '../../domain';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PointAccountRepository implements PointAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return ctx?.tx as PrismaClient ?? this.prisma;
  }

  async findByOwner(
    filter: FindAccountFilter,
    ctx?: TransactionContext,
  ): Promise<PointAccount | null> {
    const client = this.getClient(ctx);

    const record = await client.pointAccount.findUnique({
      where: {
        tenantId_ownerType_ownerId: {
          tenantId: filter.tenantId,
          ownerType: filter.ownerType,
          ownerId: filter.ownerId,
        },
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findById(
    tenantId: string,
    accountId: string,
    ctx?: TransactionContext,
  ): Promise<PointAccount | null> {
    const client = this.getClient(ctx);

    const record = await client.pointAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async create(account: PointAccount, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointAccount.create({
      data: {
        id: account.id,
        tenantId: account.tenantId,
        ownerType: account.ownerType,
        ownerId: account.ownerId,
        status: account.status,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });
  }

  async update(account: PointAccount, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx);

    await client.pointAccount.update({
      where: { id: account.id },
      data: {
        status: account.status,
        updatedAt: account.updatedAt,
      },
    });
  }

  async lockForUpdate(
    tenantId: string,
    accountId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    // Use SELECT FOR UPDATE on the account row for serialization
    // This prevents concurrent modifications to the same account
    await client.$queryRaw`
      SELECT 1 FROM point_accounts WHERE id = ${accountId} FOR UPDATE
    `;
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    ownerType: string;
    ownerId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): PointAccount {
    return PointAccount.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      owner: AccountOwner.create(record.ownerType as OwnerType, record.ownerId),
      status: record.status as AccountStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
