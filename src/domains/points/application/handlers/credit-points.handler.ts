import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PointAccount,
  PointLedgerEntry,
  LedgerEntryType,
  BalanceCalculator,
  PointsCreditedEvent,
  POINT_ACCOUNT_REPOSITORY,
  POINT_LEDGER_REPOSITORY,
  POINT_HOLD_REPOSITORY,
  IDEMPOTENCY_REPOSITORY,
  OUTBOX_REPOSITORY,
  UNIT_OF_WORK,
  UUID_GENERATOR,
  PointAccountRepositoryPort,
  PointLedgerRepositoryPort,
  PointHoldRepositoryPort,
  IdempotencyRepositoryPort,
  OutboxRepositoryPort,
  UnitOfWorkPort,
  UuidGeneratorPort,
} from '../../domain';
import { CreditPointsCommand } from '../commands';

export interface PointsReceiptResponse {
  transactionId: string;
  accountId: string;
  entryType: string;
  amount: number;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  balance?: {
    currentBalance: number;
    heldBalance: number;
    availableBalance: number;
  };
}

@Injectable()
export class CreditPointsHandler {
  private readonly logger = new Logger(CreditPointsHandler.name);
  private readonly scope = 'POINTS:CreditPoints';

  constructor(
    @Inject(POINT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: PointAccountRepositoryPort,
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
    @Inject(POINT_HOLD_REPOSITORY)
    private readonly holdRepo: PointHoldRepositoryPort,
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly idempotencyRepo: IdempotencyRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepo: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
    @Inject(UUID_GENERATOR)
    private readonly uuidGenerator: UuidGeneratorPort,
  ) {}

  async execute(command: CreditPointsCommand): Promise<PointsReceiptResponse> {
    this.logger.log(
      `Crediting ${command.amount} points to ${command.ownerType}:${command.ownerId}`,
    );

    // Validate amount
    if (command.amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    // Calculate request hash for idempotency
    const requestHash = this.calculateRequestHash(command);

    return this.unitOfWork.execute(async (ctx) => {
      // Check idempotency if key provided
      if (command.idempotencyKey) {
        const idempotencyResult = await this.idempotencyRepo.tryBegin(
          this.scope,
          command.tenantId,
          command.idempotencyKey,
          requestHash,
          ctx,
        );

        if (!idempotencyResult.isNew) {
          if (idempotencyResult.status === 'COMPLETED') {
            this.logger.debug(`Returning cached response for idempotency key`);
            return idempotencyResult.responseBody as PointsReceiptResponse;
          }
          if (idempotencyResult.status === 'IN_PROGRESS') {
            throw new Error('Operation is already in progress');
          }
        }
      }

      try {
        // Load or create account
        let account = await this.accountRepo.findByOwner(
          {
            tenantId: command.tenantId,
            ownerType: command.ownerType,
            ownerId: command.ownerId,
          },
          ctx,
        );

        if (!account) {
          const accountId = this.uuidGenerator.generate();
          account = PointAccount.create(accountId, {
            tenantId: command.tenantId,
            ownerType: command.ownerType,
            ownerId: command.ownerId,
          });
          await this.accountRepo.create(account, ctx);
        }

        // Lock account for update
        await this.accountRepo.lockForUpdate(
          command.tenantId,
          account.id,
          ctx,
        );

        // Create ledger entry
        const entryId = this.uuidGenerator.generate();
        const entry = PointLedgerEntry.create(entryId, {
          tenantId: command.tenantId,
          accountId: account.id,
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          reasonCode: command.reasonCode,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          idempotencyKey: command.idempotencyKey,
          metadata: command.metadata,
        });

        await this.ledgerRepo.appendEntry(entry, ctx);

        // Calculate new balance
        const ledgerAggregates = await this.ledgerRepo.getBalanceAggregates(
          command.tenantId,
          account.id,
          ctx,
        );
        const activeHolds = await this.holdRepo.getActiveHoldsTotal(
          command.tenantId,
          account.id,
          ctx,
        );
        const balance = BalanceCalculator.calculateFromAggregates({
          ...ledgerAggregates,
          activeHolds,
        });

        // Create domain event
        const eventId = this.uuidGenerator.generate();
        const event = new PointsCreditedEvent(
          eventId,
          command.tenantId,
          account.id,
          command.amount,
          command.referenceType,
          command.referenceId,
          command.reasonCode,
          entryId,
          command.requestId,
          command.actorId,
        );

        // Enqueue to outbox
        await this.outboxRepo.enqueue(
          {
            tenantId: command.tenantId,
            aggregateType: 'POINTS',
            aggregateId: account.id,
            eventType: event.type,
            payload: event.toPayload(),
          },
          ctx,
        );

        // Build response
        const response: PointsReceiptResponse = {
          transactionId: entryId,
          accountId: account.id,
          entryType: LedgerEntryType.CREDIT,
          amount: command.amount,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          createdAt: entry.createdAt.toISOString(),
          balance: {
            currentBalance: balance.currentBalance,
            heldBalance: balance.heldBalance,
            availableBalance: balance.availableBalance,
          },
        };

        // Complete idempotency
        if (command.idempotencyKey) {
          await this.idempotencyRepo.complete(
            this.scope,
            command.tenantId,
            command.idempotencyKey,
            response,
            ctx,
          );
        }

        return response;
      } catch (error) {
        // Mark idempotency as failed
        if (command.idempotencyKey) {
          await this.idempotencyRepo.fail(
            this.scope,
            command.tenantId,
            command.idempotencyKey,
            { error: (error as Error).message },
            ctx,
          );
        }
        throw error;
      }
    });
  }

  private calculateRequestHash(command: CreditPointsCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      ownerType: command.ownerType,
      ownerId: command.ownerId,
      amount: command.amount,
      reasonCode: command.reasonCode,
      referenceType: command.referenceType,
      referenceId: command.referenceId,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
