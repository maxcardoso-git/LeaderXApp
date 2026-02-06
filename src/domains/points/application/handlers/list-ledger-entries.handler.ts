import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_LEDGER_REPOSITORY,
  PointLedgerRepositoryPort,
  PaginatedLedgerResult,
} from '../../domain';
import { ListLedgerEntriesQuery } from '../queries';

@Injectable()
export class ListLedgerEntriesHandler {
  constructor(
    @Inject(POINT_LEDGER_REPOSITORY)
    private readonly ledgerRepo: PointLedgerRepositoryPort,
  ) {}

  async execute(query: ListLedgerEntriesQuery): Promise<PaginatedLedgerResult> {
    return this.ledgerRepo.listEntriesByMember(
      {
        tenantId: query.tenantId,
        memberId: query.memberId,
        entryType: query.entryType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        status: query.status,
        journeyCode: query.journeyCode,
      },
      {
        page: query.page,
        size: query.size,
      },
    );
  }
}
