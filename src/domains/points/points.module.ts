import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain ports
import {
  POINT_ACCOUNT_REPOSITORY,
  POINT_LEDGER_REPOSITORY,
  POINT_HOLD_REPOSITORY,
  IDEMPOTENCY_REPOSITORY,
  OUTBOX_REPOSITORY,
  UNIT_OF_WORK,
  UUID_GENERATOR,
  CLOCK,
} from './domain';

// Outbound adapters (repositories)
import {
  PointAccountRepository,
  PointLedgerRepository,
  PointHoldRepository,
  IdempotencyRepository,
  OutboxRepository,
  PrismaUnitOfWork,
  UuidGenerator,
  SystemClock,
} from './outbound/repositories';

// Application handlers
import {
  CreditPointsHandler,
  DebitPointsHandler,
  HoldPointsHandler,
  ReleaseHoldHandler,
  CommitHoldHandler,
  GetBalanceHandler,
  GetStatementHandler,
  PostPointsEntryHandler,
  ReversePointsEntryHandler,
  ListLedgerEntriesHandler,
  GetLedgerEntryHandler,
  GetMemberBalanceHandler,
  ConciliationHandler,
} from './application/handlers';

// Inbound adapters (controllers)
import { PointsController, PointsLedgerController, ConciliationController } from './inbound/controllers';

const repositoryProviders = [
  {
    provide: POINT_ACCOUNT_REPOSITORY,
    useClass: PointAccountRepository,
  },
  {
    provide: POINT_LEDGER_REPOSITORY,
    useClass: PointLedgerRepository,
  },
  {
    provide: POINT_HOLD_REPOSITORY,
    useClass: PointHoldRepository,
  },
  {
    provide: IDEMPOTENCY_REPOSITORY,
    useClass: IdempotencyRepository,
  },
  {
    provide: OUTBOX_REPOSITORY,
    useClass: OutboxRepository,
  },
  {
    provide: UNIT_OF_WORK,
    useClass: PrismaUnitOfWork,
  },
  {
    provide: UUID_GENERATOR,
    useClass: UuidGenerator,
  },
  {
    provide: CLOCK,
    useClass: SystemClock,
  },
];

const handlers = [
  CreditPointsHandler,
  DebitPointsHandler,
  HoldPointsHandler,
  ReleaseHoldHandler,
  CommitHoldHandler,
  GetBalanceHandler,
  GetStatementHandler,
  PostPointsEntryHandler,
  ReversePointsEntryHandler,
  ListLedgerEntriesHandler,
  GetLedgerEntryHandler,
  GetMemberBalanceHandler,
  ConciliationHandler,
];

@Module({
  controllers: [PointsController, PointsLedgerController, ConciliationController],
  providers: [
    PrismaService,
    ...repositoryProviders,
    ...handlers,
  ],
  exports: [...repositoryProviders, ...handlers],
})
export class PointsModule {}
