import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IdempotencyRepositoryPort,
  IdempotencyResult,
  TransactionContext,
} from '../../domain';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Idempotency scope constants
 */
export const IdempotencyScope = {
  // Points
  CREDIT_POINTS: 'POINTS:CreditPoints',
  DEBIT_POINTS: 'POINTS:DebitPoints',
  HOLD_POINTS: 'POINTS:HoldPoints',
  RELEASE_HOLD: 'POINTS:ReleaseHold',
  COMMIT_HOLD: 'POINTS:CommitHold',
  // Reservations
  CREATE_RESERVATION: 'RESERVATIONS:CreateReservation',
  CONFIRM_RESERVATION: 'RESERVATIONS:ConfirmReservation',
  RELEASE_RESERVATION: 'RESERVATIONS:ReleaseReservation',
  // Identity
  IDENTITY_CREATE_USER: 'IDENTITY:CreateUser',
  IDENTITY_CREATE_PERMISSION: 'IDENTITY:CreatePermission',
  IDENTITY_CREATE_ROLE: 'IDENTITY:CreateRole',
  IDENTITY_ASSIGN_ROLE: 'IDENTITY:AssignRole',
} as const;

export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  scope: string;
  key: string;
  requestHash: string;
  status: string;
  responseBody: unknown;
  createdAt: Date;
}

const DEFAULT_TTL_HOURS = 24;

@Injectable()
export class IdempotencyRepository implements IdempotencyRepositoryPort {
  private readonly logger = new Logger(IdempotencyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return ctx?.tx as PrismaClient ?? this.prisma;
  }

  private getExpiresAt(ttlHours: number = DEFAULT_TTL_HOURS): Date {
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  async tryBegin(
    scope: string,
    tenantId: string,
    key: string,
    requestHash: string,
    ctx?: TransactionContext,
  ): Promise<IdempotencyResult> {
    const client = this.getClient(ctx);

    // Try to find existing record
    const existing = await client.idempotencyRecord.findUnique({
      where: {
        tenantId_scope_idemKey: {
          tenantId,
          scope,
          idemKey: key,
        },
      },
    });

    if (existing) {
      // Check if request hash matches
      if (existing.requestHash !== requestHash) {
        this.logger.warn(
          `Idempotency conflict for ${scope}:${key} - request hash mismatch`,
        );
        throw new IdempotencyConflictError(
          `Request body does not match previous request with key "${key}"`,
        );
      }

      // Return existing result
      return {
        isNew: false,
        status: existing.status as 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
        responseBody: existing.responsePayload ?? undefined,
      };
    }

    // Create new record
    try {
      await client.idempotencyRecord.create({
        data: {
          tenantId,
          scope,
          idemKey: key,
          requestHash,
          status: 'IN_PROGRESS',
          expiresAt: this.getExpiresAt(),
        },
      });

      return {
        isNew: true,
        status: 'IN_PROGRESS',
      };
    } catch (error) {
      // Handle race condition - another request might have created the record
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unique constraint violation - record was created by another request
        const existing = await client.idempotencyRecord.findUnique({
          where: {
            tenantId_scope_idemKey: {
              tenantId,
              scope,
              idemKey: key,
            },
          },
        });

        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new IdempotencyConflictError(
              `Request body does not match previous request with key "${key}"`,
            );
          }

          return {
            isNew: false,
            status: existing.status as 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
            responseBody: existing.responsePayload ?? undefined,
          };
        }
      }
      throw error;
    }
  }

  async complete(
    scope: string,
    tenantId: string,
    key: string,
    responseBody: unknown,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.idempotencyRecord.update({
      where: {
        tenantId_scope_idemKey: {
          tenantId,
          scope,
          idemKey: key,
        },
      },
      data: {
        status: 'COMPLETED',
        responsePayload: responseBody as Prisma.InputJsonValue,
      },
    });
  }

  async fail(
    scope: string,
    tenantId: string,
    key: string,
    errorBody: unknown,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.idempotencyRecord.update({
      where: {
        tenantId_scope_idemKey: {
          tenantId,
          scope,
          idemKey: key,
        },
      },
      data: {
        status: 'FAILED',
        errorPayload: errorBody as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Find an existing idempotency record by key
   */
  async findByKey(
    tenantId: string,
    scope: string,
    key: string,
    ctx?: TransactionContext,
  ): Promise<IdempotencyRecord | null> {
    const client = this.getClient(ctx);

    const record = await client.idempotencyRecord.findUnique({
      where: {
        tenantId_scope_idemKey: {
          tenantId,
          scope,
          idemKey: key,
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      tenantId: record.tenantId,
      scope: record.scope,
      key: record.idemKey,
      requestHash: record.requestHash,
      status: record.status,
      responseBody: record.responsePayload,
      createdAt: record.createdAt,
    };
  }

  /**
   * Create a new idempotency record with response
   */
  async create(
    data: {
      tenantId: string;
      scope: string;
      key: string;
      requestHash: string;
      responseBody: unknown;
    },
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.idempotencyRecord.create({
      data: {
        tenantId: data.tenantId,
        scope: data.scope,
        idemKey: data.key,
        requestHash: data.requestHash,
        status: 'COMPLETED',
        responsePayload: data.responseBody as Prisma.InputJsonValue,
        expiresAt: this.getExpiresAt(),
      },
    });
  }
}

/**
 * Error thrown when idempotency key conflicts with different request body
 */
export class IdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

/**
 * Error thrown when operation is still in progress
 */
export class IdempotencyInProgressError extends Error {
  readonly code = 'IDEMPOTENCY_IN_PROGRESS';

  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyInProgressError';
  }
}
