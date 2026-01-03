import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Controllers
import { ApprovalsController } from './controllers/approvals.controller';

// Facades
import { ApprovalsFacade } from './facades/approvals.facade';

// Services
import { ApprovalsService } from './services/approvals.service';

// Handlers
import { PointsOnApprovalDecidedHandler } from './handlers/points-on-approval-decided.handler';
import { NotifyOnApprovalDecidedHandler } from './handlers/notify-on-approval-decided.handler';
import { AuditOnApprovalDecidedHandler } from './handlers/audit-on-approval-decided.handler';

// Common Modules
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { EventingModule } from '../../common/eventing/eventing.module';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';

// Event Bus
import { InMemoryEventBus } from '../../common/eventing/in-memory-event-bus';

// API Clients
import {
  ApprovalsApiClient,
  PointsApiClient,
  CommunicationsApiClient,
  AuditApiClient,
} from '../../infrastructure/openapi-clients';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    IdempotencyModule,
    EventingModule,
    OutboxModule,
    RequestContextModule,
  ],
  controllers: [ApprovalsController],
  providers: [
    // Facades
    ApprovalsFacade,

    // Services
    ApprovalsService,

    // Event Handlers
    PointsOnApprovalDecidedHandler,
    NotifyOnApprovalDecidedHandler,
    AuditOnApprovalDecidedHandler,

    // API Clients
    ApprovalsApiClient,
    PointsApiClient,
    CommunicationsApiClient,
    AuditApiClient,
  ],
  exports: [ApprovalsFacade],
})
export class ApprovalsModule implements OnModuleInit {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly pointsHandler: PointsOnApprovalDecidedHandler,
    private readonly notifyHandler: NotifyOnApprovalDecidedHandler,
    private readonly auditHandler: AuditOnApprovalDecidedHandler,
  ) {}

  onModuleInit() {
    // Register event handlers
    this.eventBus.registerHandler(this.pointsHandler);
    this.eventBus.registerHandler(this.notifyHandler);
    this.eventBus.registerHandler(this.auditHandler);
  }
}
