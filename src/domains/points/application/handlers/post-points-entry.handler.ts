import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PointAccount,
  PointLedgerEntry,
  LedgerEntryType,
  OwnerType,
  BalanceCalculator,
  PointsEntryPostedEvent,
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
import { PostPointsEntryCommand } from '../commands';
import { ValidationError, PointsReceiptResponse } from './credit-points.handler';

@Injectable()
export class PostPointsEntryHandler {
  private readonly logger = new Logger(PostPointsEntryHandler.name);
  private readonly scope = 'POINTS:PostPointsEntry';

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

  async execute(command: PostPointsEntryCommand): Promise<PointsReceiptResponse> {
    this.logger.log(
      `Posting ${command.entryType} ${command.amount} points for member ${command.memberId} [journey=${command.journeyCode}]`,
    );

    // Guardrails
    if (command.amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }
    if (!command.journeyCode || !command.journeyTrigger) {
      throw new ValidationError('Journey reference is required for ledger entries');
    }
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
        // Find or create account for member
        let account = await this.accountRepo.findByOwner(
          {
            tenantId: command.tenantId,
            ownerType: OwnerType.USER,
            ownerId: command.memberId,
          },
          ctx,
        );

        if (!account) {
          const accountId = this.uuidGenerator.generate();
          account = PointAccount.create(accountId, {
            tenantId: command.tenantId,
            ownerType: OwnerType.USER,
            ownerId: command.memberId,
          });
          await this.accountRepo.create(account, ctx);
        }

        // Lock account
        await this.accountRepo.lockForUpdate(
          command.tenantId,
          account.id,
          ctx,
        );

        // Create journey-aware ledger entry
        const entryId = this.uuidGenerator.generate();
        const entryType = command.entryType === 'CREDIT'
          ? LedgerEntryType.CREDIT
          : LedgerEntryType.DEBIT;

        const entry = PointLedgerEntry.createJourneyEntry(entryId, {
          tenantId: command.tenantId,
          accountId: account.id,
          entryType,
          amount: command.amount,
          reasonCode: command.reasonCode,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          idempotencyKey: command.idempotencyKey,
          journeyCode: command.journeyCode,
          journeyTrigger: command.journeyTrigger,
          approvalPolicyCode: command.approvalPolicyCode,
          approvalRequestId: command.approvalRequestId,
          sourceEventId: command.sourceEventId,
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

        // Emit domain event
        const eventId = this.uuidGenerator.generate();
        const event = new PointsEntryPostedEvent(
          eventId,
          command.tenantId,
          entryId,
          account.id,
          command.memberId,
          command.entryType,
          command.amount,
          command.reasonCode,
          command.referenceType,
          command.referenceId,
          command.journeyCode,
          command.journeyTrigger,
          command.idempotencyKey,
          command.approvalPolicyCode,
          command.approvalRequestId,
          command.sourceEventId,
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

        // Build response
        const response: PointsReceiptResponse = {
          transactionId: entryId,
          accountId: account.id,
          entryType: command.entryType,
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

  private calculateRequestHash(command: PostPointsEntryCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      memberId: command.memberId,
      entryType: command.entryType,
      amount: command.amount,
      journeyCode: command.journeyCode,
      journeyTrigger: command.journeyTrigger,
      referenceType: command.referenceType,
      referenceId: command.referenceId,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
