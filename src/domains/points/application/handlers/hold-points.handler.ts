import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PointAccount,
  PointLedgerEntry,
  PointHold,
  LedgerEntryType,
  HoldStatus,
  BalanceCalculator,
  PointsHeldEvent,
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
import { HoldPointsCommand } from '../commands';
import { ValidationError } from './credit-points.handler';
import { InsufficientFundsError } from './debit-points.handler';

export interface HoldReceiptResponse {
  holdId: string;
  accountId: string;
  status: string;
  amount: number;
  referenceType: string;
  referenceId: string;
  expiresAt?: string;
  balance?: {
    currentBalance: number;
    heldBalance: number;
    availableBalance: number;
  };
}

@Injectable()
export class HoldPointsHandler {
  private readonly logger = new Logger(HoldPointsHandler.name);
  private readonly scope = 'POINTS:HoldPoints';

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

  async execute(command: HoldPointsCommand): Promise<HoldReceiptResponse> {
    this.logger.log(
      `Holding ${command.amount} points for ${command.ownerType}:${command.ownerId} (ref: ${command.referenceType}:${command.referenceId})`,
    );

    if (command.amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    const requestHash = this.calculateRequestHash(command);

    return this.unitOfWork.execute(async (ctx) => {
      // Check idempotency
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
            return idempotencyResult.responseBody as HoldReceiptResponse;
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

        // Lock account
        await this.accountRepo.lockForUpdate(
          command.tenantId,
          account.id,
          ctx,
        );

        // Check if hold already exists for this reference
        const existingHold = await this.holdRepo.findHoldByReference(
          command.tenantId,
          account.id,
          command.referenceType,
          command.referenceId,
          ctx,
        );

        if (existingHold) {
          return this.handleExistingHold(existingHold, command, account.id);
        }

        // Check available balance
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

        if (balance.availableBalance < command.amount) {
          throw new InsufficientFundsError(
            `Insufficient funds. Available: ${balance.availableBalance}, Requested: ${command.amount}`,
          );
        }

        // Create hold
        const holdId = this.uuidGenerator.generate();
        const hold = PointHold.create(holdId, {
          tenantId: command.tenantId,
          accountId: account.id,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          amount: command.amount,
          expiresAt: command.expiresAt,
        });

        await this.holdRepo.create(hold, ctx);

        // Create ledger entry for the hold
        const entryId = this.uuidGenerator.generate();
        const entry = PointLedgerEntry.create(entryId, {
          tenantId: command.tenantId,
          accountId: account.id,
          entryType: LedgerEntryType.HOLD,
          amount: command.amount,
          reasonCode: command.reasonCode,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          idempotencyKey: command.idempotencyKey,
          metadata: command.metadata,
        });

        await this.ledgerRepo.appendEntry(entry, ctx);

        // Calculate new balance
        const newActiveHolds = activeHolds + command.amount;
        const newBalance = BalanceCalculator.calculateFromAggregates({
          ...ledgerAggregates,
          activeHolds: newActiveHolds,
        });

        // Create domain event
        const eventId = this.uuidGenerator.generate();
        const event = new PointsHeldEvent(
          eventId,
          command.tenantId,
          account.id,
          holdId,
          command.amount,
          command.referenceType,
          command.referenceId,
          command.expiresAt,
          command.requestId,
          command.actorId,
        );

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

        const response: HoldReceiptResponse = {
          holdId,
          accountId: account.id,
          status: HoldStatus.ACTIVE,
          amount: command.amount,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          expiresAt: command.expiresAt?.toISOString(),
          balance: {
            currentBalance: newBalance.currentBalance,
            heldBalance: newBalance.heldBalance,
            availableBalance: newBalance.availableBalance,
          },
        };

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

  private handleExistingHold(
    existingHold: PointHold,
    command: HoldPointsCommand,
    accountId: string,
  ): HoldReceiptResponse {
    // If hold is ACTIVE with same amount, return it (idempotent)
    if (
      existingHold.status === HoldStatus.ACTIVE &&
      existingHold.amount === command.amount
    ) {
      return {
        holdId: existingHold.id,
        accountId,
        status: existingHold.status,
        amount: existingHold.amount,
        referenceType: existingHold.referenceType,
        referenceId: existingHold.referenceId,
        expiresAt: existingHold.expiresAt?.toISOString(),
      };
    }

    // If hold exists but with different amount
    if (
      existingHold.status === HoldStatus.ACTIVE &&
      existingHold.amount !== command.amount
    ) {
      throw new HoldAlreadyExistsError(
        `Hold already exists for reference ${command.referenceType}:${command.referenceId} with different amount`,
      );
    }

    // If hold is not active (COMMITTED, RELEASED, EXPIRED)
    throw new HoldNotActiveError(
      `Hold for reference ${command.referenceType}:${command.referenceId} is no longer active (status: ${existingHold.status})`,
    );
  }

  private calculateRequestHash(command: HoldPointsCommand): string {
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

export class HoldAlreadyExistsError extends Error {
  readonly code = 'HOLD_ALREADY_EXISTS_DIFFERENT_AMOUNT';

  constructor(message: string) {
    super(message);
    this.name = 'HoldAlreadyExistsError';
  }
}

export class HoldNotActiveError extends Error {
  readonly code = 'HOLD_NOT_ACTIVE';

  constructor(message: string) {
    super(message);
    this.name = 'HoldNotActiveError';
  }
}
