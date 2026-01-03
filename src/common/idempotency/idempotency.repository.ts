import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { IdempotencyRecord, IdempotencyStatus } from './idempotency.interface';

@Injectable()
export class IdempotencyRepository {
  private readonly logger = new Logger(IdempotencyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an existing idempotency record
   */
  async findByKey(
    scope: string,
    idemKey: string,
    tenantId: string,
  ): Promise<IdempotencyRecord | null> {
    const record = await this.prisma.idempotencyRecord.findFirst({
      where: {
        scope,
        idemKey,
        tenantId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      scope: record.scope,
      idemKey: record.idemKey,
      tenantId: record.tenantId,
      status: record.status as IdempotencyStatus,
      requestHash: record.requestHash,
      httpStatus: record.httpStatus ?? undefined,
      responsePayload: record.responsePayload ?? undefined,
      errorPayload: record.errorPayload ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Create a new idempotency record with IN_PROGRESS status
   */
  async create(
    scope: string,
    idemKey: string,
    tenantId: string,
    requestHash: string,
    ttlHours: number = 24,
  ): Promise<IdempotencyRecord> {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const record = await this.prisma.idempotencyRecord.create({
      data: {
        scope,
        idemKey,
        tenantId,
        status: IdempotencyStatus.IN_PROGRESS,
        requestHash,
        expiresAt,
      },
    });

    return {
      id: record.id,
      scope: record.scope,
      idemKey: record.idemKey,
      tenantId: record.tenantId,
      status: record.status as IdempotencyStatus,
      requestHash: record.requestHash,
      httpStatus: record.httpStatus ?? undefined,
      responsePayload: record.responsePayload ?? undefined,
      errorPayload: record.errorPayload ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Mark an idempotency record as completed
   */
  async markCompleted(
    id: string,
    httpStatus: number,
    responsePayload: unknown,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id },
      data: {
        status: IdempotencyStatus.COMPLETED,
        httpStatus,
        responsePayload: responsePayload as object,
      },
    });
  }

  /**
   * Mark an idempotency record as failed
   */
  async markFailed(id: string, httpStatus: number, errorPayload: unknown): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id },
      data: {
        status: IdempotencyStatus.FAILED,
        httpStatus,
        errorPayload: errorPayload as object,
      },
    });
  }

  /**
   * Delete a failed record to allow retry
   */
  async deleteById(id: string): Promise<void> {
    await this.prisma.idempotencyRecord.delete({
      where: { id },
    });
  }

  /**
   * Delete expired records (called by cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired idempotency records`);
    }

    return result.count;
  }
}
