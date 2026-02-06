import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PointLedgerEntry,
  LedgerEntryType,
  LedgerEntryStatus,
  PointsEntryReversedEvent,
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
  OwnerType,
  BalanceCalculator,
} from '../../domain';
import { ReversePointsEntryCommand } from '../commands';
import { ValidationError, PointsReceiptResponse } from './credit-points.handler';

export class EntryNotFoundError extends Error {
  readonly code = 'ENTRY_NOT_FOUND';
  constructor(entryId: string) {
    super(`Ledger entry ${entryId} not found`);
    this.name = 'EntryNotFoundError';
  }
}

export class EntryAlreadyReversedError extends Error {
  readonly code = 'ENTRY_ALREADY_REVERSED';
  constructor(entryId: string) {
    super(`Ledger entry ${entryId} is already reversed`);
    this.name = 'EntryAlreadyReversedError';
  }
}

@Injectable()
export class ReversePointsEntryHandler {
  private readonly logger = new Logger(ReversePointsEntryHandler.name);
  private readonly scope = 'POINTS:ReversePointsEntry';

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

  async execute(command: ReversePointsEntryCommand): Promise<PointsReceiptResponse> {
    this.logger.log(`Reversing ledger entry ${command.entryId}`);

    if (!command.idempotencyKey) {
      throw new ValidationError('Idempotency key is required');
    }

    const requestHash = this.calculateRequestHash(command);

    return this.unitOfWork.execute(async (ctx) => {
      // Idempotency check
      const idempotencyResult = await this.idempotencyRepo.tryBegin(
        this.scope,
        command.tenantId,
        command.idempotencyKey,
        requestHash,
        ctx,
      );

      if (!idempotencyResult.isNew) {
        if (idempotencyResult.status === 'COMPLETED') {
          this.logger.debug('Returning cached response for idempotency key');
          return idempotencyResult.responseBody as PointsReceiptResponse;
        }
        if (idempotencyResult.status === 'IN_PROGRESS') {
          throw new Error('Operation is already in progress');
        }
      }

      try {
        // Find original entry
        const originalEntry = await this.ledgerRepo.findById(
          command.tenantId,
          command.entryId,
          ctx,
        );

        if (!originalEntry) {
          throw new EntryNotFoundError(command.entryId);
        }

        if (originalEntry.status === LedgerEntryStatus.REVERSED) {
          throw new EntryAlreadyReversedError(command.entryId);
        }

        // Lock account
        await this.accountRepo.lockForUpdate(
          command.tenantId,
          originalEntry.accountId,
          ctx,
        );

        // Create compensatory entry (opposite type)
        const reversalEntryId = this.uuidGenerator.generate();
        const oppositeType = originalEntry.isCredit()
          ? LedgerEntryType.DEBIT
          : LedgerEntryType.CREDIT;

        const journeyRef = originalEntry.journeyReference;

        const reversalEntry = PointLedgerEntry.createJourneyEntry(reversalEntryId, {
          tenantId: command.tenantId,
          accountId: originalEntry.accountId,
          entryType: oppositeType,
          amount: originalEntry.amount,
          reasonCode: command.reasonCode,
          referenceType: originalEntry.referenceType,
          referenceId: originalEntry.referenceId,
          idempotencyKey: command.idempotencyKey,
          journeyCode: journeyRef?.journeyCode ?? 'REVERSAL',
          journeyTrigger: journeyRef?.journeyTrigger ?? 'MANUAL_REVERSAL',
          approvalPolicyCode: journeyRef?.approvalPolicyCode,
          approvalRequestId: journeyRef?.approvalRequestId,
          sourceEventId: journeyRef?.sourceEventId,
          metadata: { reversalOf: command.entryId },
          reversalOfId: originalEntry.id,
        });

        await this.ledgerRepo.appendEntry(reversalEntry, ctx);

        // Mark original as reversed
        originalEntry.markAsReversed(reversalEntryId);
        await this.ledgerRepo.updateStatus(originalEntry, ctx);

        // Calculate new balance
        const ledgerAggregates = await this.ledgerRepo.getBalanceAggregates(
          command.tenantId,
          originalEntry.accountId,
          ctx,
        );
        const activeHolds = await this.holdRepo.getActiveHoldsTotal(
          command.tenantId,
          originalEntry.accountId,
          ctx,
        );
        const balance = BalanceCalculator.calculateFromAggregates({
          ...ledgerAggregates,
          activeHolds,
        });

        // Resolve memberId from account
        const account = await this.accountRepo.findById(
          command.tenantId,
          originalEntry.accountId,
          ctx,
        );
        const memberId = account?.ownerId ?? '';

        // Emit reversal event
        const eventId = this.uuidGenerator.generate();
        const event = new PointsEntryReversedEvent(
          eventId,
          command.tenantId,
          originalEntry.id,
          reversalEntryId,
          originalEntry.accountId,
          memberId,
          originalEntry.amount,
          command.reasonCode,
          command.requestId,
          command.actorId,
        );

        await this.outboxRepo.enqueue(
          {
            tenantId: command.tenantId,
            aggregateType: 'POINTS',
            aggregateId: originalEntry.accountId,
            eventType: event.type,
            payload: event.toPayload(),
          },
          ctx,
        );

        // Build response
        const response: PointsReceiptResponse = {
          transactionId: reversalEntryId,
          accountId: originalEntry.accountId,
          entryType: oppositeType,
          amount: originalEntry.amount,
          referenceType: originalEntry.referenceType,
          referenceId: originalEntry.referenceId,
          createdAt: reversalEntry.createdAt.toISOString(),
          balance: {
            currentBalance: balance.currentBalance,
            heldBalance: balance.heldBalance,
            availableBalance: balance.availableBalance,
          },
        };

        // Complete idempotency
        await this.idempotencyRepo.complete(
          this.scope,
          command.tenantId,
          command.idempotencyKey,
          response,
          ctx,
        );

        return response;
      } catch (error) {
        await this.idempotencyRepo.fail(
          this.scope,
          command.tenantId,
          command.idempotencyKey,
          { error: (error as Error).message },
          ctx,
        );
        throw error;
      }
    });
  }

  private calculateRequestHash(command: ReversePointsEntryCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      entryId: command.entryId,
      reasonCode: command.reasonCode,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
