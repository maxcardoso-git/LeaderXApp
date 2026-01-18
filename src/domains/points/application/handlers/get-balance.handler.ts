import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BalanceCalculator,
  POINT_ACCOUNT_REPOSITORY,
  POINT_LEDGER_REPOSITORY,
  POINT_HOLD_REPOSITORY,
  PointAccountRepositoryPort,
  PointLedgerRepositoryPort,
  PointHoldRepositoryPort,
} from '../../domain';
import { GetBalanceQuery } from '../queries';

export interface BalanceResponse {
  accountId: string | null;
  currentBalance: number;
  heldBalance: number;
  availableBalance: number;
}

@Injectable()
export class GetBalanceHandler {
  private readonly logger = new Logger(GetBalanceHandler.name);

  constructor(
    @Inject(POINT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: PointAccountRepositoryPort,
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
    @Inject(POINT_HOLD_REPOSITORY)
    private readonly holdRepo: PointHoldRepositoryPort,
  ) {}

  async execute(query: GetBalanceQuery): Promise<BalanceResponse> {
    this.logger.debug(
      `Getting balance for ${query.ownerType}:${query.ownerId}`,
    );

    // Find account
    const account = await this.accountRepo.findByOwner({
      tenantId: query.tenantId,
      ownerType: query.ownerType,
      ownerId: query.ownerId,
    });

    if (!account) {
      // Return zeros for non-existent account
      return {
        accountId: null,
        currentBalance: 0,
        heldBalance: 0,
        availableBalance: 0,
      };
    }

    // Get balance aggregates
    const ledgerAggregates = await this.ledgerRepo.getBalanceAggregates(
      query.tenantId,
      account.id,
    );

    const activeHolds = await this.holdRepo.getActiveHoldsTotal(
      query.tenantId,
      account.id,
    );

    const balance = BalanceCalculator.calculateFromAggregates({
      ...ledgerAggregates,
      activeHolds,
    });

    return {
      accountId: account.id,
      currentBalance: balance.currentBalance,
      heldBalance: balance.heldBalance,
      availableBalance: balance.availableBalance,
    };
  }
}
