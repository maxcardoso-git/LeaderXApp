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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CqrsModule,
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
