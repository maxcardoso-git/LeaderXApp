import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

import {
  TicketBatchHandler,
  TicketHandler,
  InvitationHandler,
  InvitationPolicyHandler,
} from './application/handlers';

import {
  TicketBatchController,
  TicketController,
  InvitationController,
} from './inbound/controllers';

@Module({
  controllers: [TicketBatchController, TicketController, InvitationController],
  providers: [
    PrismaService,
    TicketBatchHandler,
    TicketHandler,
    InvitationHandler,
    InvitationPolicyHandler,
  ],
  exports: [TicketHandler, InvitationHandler],
})
export class TicketsModule {}
