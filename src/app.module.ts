import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

// Infrastructure
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ApprovalRepository } from '@infrastructure/persistence/approvals/approval.repository';
import { ApprovalsController } from '@infrastructure/http/approvals/approvals.controller';

// Application
import { CommandHandlers, QueryHandlers } from '@application/approvals';

// Domain
import { APPROVAL_REPOSITORY } from '@domain/approvals';

// Points Domain
import { PointsModule } from './domains/points';

// Reservations Domain
import { ReservationsModule } from './domains/reservations/reservations.module';

// Identity Domain
import { IdentityModule } from './domains/identity';

// Events Domain
import { EventsModule } from './domains/events/events.module';

// Governance Domain
import { GovernanceModule } from './domains/governance/governance.module';

// Audit & Compliance Domain
import { AuditModule } from './domains/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CqrsModule,
    PointsModule,
    ReservationsModule,
    IdentityModule,
    EventsModule,
    GovernanceModule,
    AuditModule,
  ],
  controllers: [ApprovalsController],
  providers: [
    // Infrastructure
    PrismaService,
    {
      provide: APPROVAL_REPOSITORY,
      useClass: ApprovalRepository,
    },

    // Application - Command Handlers
    ...CommandHandlers,

    // Application - Query Handlers
    ...QueryHandlers,
  ],
})
export class AppModule {}
