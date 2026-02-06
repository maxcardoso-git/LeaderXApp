import { Inject, Injectable } from '@nestjs/common';
import {
  PointLedgerEntry,
  POINT_LEDGER_REPOSITORY,
  PointLedgerRepositoryPort,
} from '../../domain';
import { GetLedgerEntryQuery } from '../queries';

@Injectable()
export class GetLedgerEntryHandler {
  constructor(
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
  ) {}

  async execute(query: GetLedgerEntryQuery): Promise<PointLedgerEntry | null> {
    return this.ledgerRepo.findById(query.tenantId, query.entryId);
  }
}
