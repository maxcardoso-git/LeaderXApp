import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PointLedgerEntry,
  LedgerEntryType,
  HoldStatus,
  BalanceCalculator,
  PointsCommittedEvent,
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
import { CommitHoldCommand } from '../commands';
import { HoldReceiptResponse } from './hold-points.handler';
import { HoldNotFoundError } from './release-hold.handler';

@Injectable()
export class CommitHoldHandler {
  private readonly logger = new Logger(CommitHoldHandler.name);
  private readonly scope = 'POINTS:CommitHold';

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

  async execute(command: CommitHoldCommand): Promise<HoldReceiptResponse> {
    this.logger.log(
      `Committing hold for ${command.ownerType}:${command.ownerId} (ref: ${command.referenceType}:${command.referenceId})`,
    );

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
        // Load account
        const account = await this.accountRepo.findByOwner(
          {
            tenantId: command.tenantId,
            ownerType: command.ownerType,
            ownerId: command.ownerId,
          },
          ctx,
        );

        if (!account) {
          throw new HoldNotFoundError(
            `Account not found for ${command.ownerType}:${command.ownerId}`,
          );
        }

        // Lock account
        await this.accountRepo.lockForUpdate(
          command.tenantId,
          account.id,
          ctx,
        );

        // Find active hold
        const hold = await this.holdRepo.findActiveHoldByReference(
          command.tenantId,
          account.id,
          command.referenceType,
          command.referenceId,
          ctx,
        );

        if (!hold) {
          throw new HoldNotFoundError(
            `Active hold not found for reference ${command.referenceType}:${command.referenceId}`,
          );
        }

        // Commit the hold
        hold.commit();
        await this.holdRepo.updateStatus(hold, ctx);

        // Create ledger entry for the commit (this decreases balance)
        const entryId = this.uuidGenerator.generate();
        const entry = PointLedgerEntry.create(entryId, {
          tenantId: command.tenantId,
          accountId: account.id,
          entryType: LedgerEntryType.COMMIT,
          amount: hold.amount,
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
        const event = new PointsCommittedEvent(
          eventId,
          command.tenantId,
          account.id,
          hold.id,
          hold.amount,
          command.referenceType,
          command.referenceId,
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
          holdId: hold.id,
          accountId: account.id,
          status: HoldStatus.COMMITTED,
          amount: hold.amount,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          balance: {
            currentBalance: balance.currentBalance,
            heldBalance: balance.heldBalance,
            availableBalance: balance.availableBalance,
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

  private calculateRequestHash(command: CommitHoldCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      ownerType: command.ownerType,
      ownerId: command.ownerId,
      referenceType: command.referenceType,
      referenceId: command.referenceId,
      reasonCode: command.reasonCode,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
