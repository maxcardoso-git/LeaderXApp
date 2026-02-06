import { Inject, Injectable } from '@nestjs/common';
import {
  OwnerType,
  BalanceCalculator,
  Balance,
  POINT_ACCOUNT_REPOSITORY,
  POINT_LEDGER_REPOSITORY,
  POINT_HOLD_REPOSITORY,
  PointAccountRepositoryPort,
  PointLedgerRepositoryPort,
  PointHoldRepositoryPort,
} from '../../domain';
import { GetMemberBalanceQuery } from '../queries';

export interface MemberBalanceResponse {
  memberId: string;
  accountId: string;
  currentBalance: number;
  heldBalance: number;
  availableBalance: number;
}

@Injectable()
export class GetMemberBalanceHandler {
  constructor(
    @Inject(POINT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: PointAccountRepositoryPort,
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
    @Inject(POINT_HOLD_REPOSITORY)
    private readonly holdRepo: PointHoldRepositoryPort,
  ) {}

  async execute(query: GetMemberBalanceQuery): Promise<MemberBalanceResponse | null> {
    const account = await this.accountRepo.findByOwner({
      tenantId: query.tenantId,
      ownerType: OwnerType.USER,
      ownerId: query.memberId,
    });

    if (!account) {
      return {
        memberId: query.memberId,
        accountId: '',
        currentBalance: 0,
        heldBalance: 0,
        availableBalance: 0,
      };
    }

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
      memberId: query.memberId,
      accountId: account.id,
      currentBalance: balance.currentBalance,
      heldBalance: balance.heldBalance,
      availableBalance: balance.availableBalance,
    };
  }
}
