import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

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

// Event Bus
import { InMemoryEventBus } from '../../common/eventing/in-memory-event-bus';

// OpenAPI Clients
import { ApprovalsService as ApprovalsApiClient } from '../../../services/admin-bff/api/approvals.service';
import { PointsService as PointsApiClient } from '../../../services/admin-bff/api/points.service';
import { CommunicationsService as CommsApiClient } from '../../../services/admin-bff/api/communications.service';
import { AuditService as AuditApiClient } from '../../../services/admin-bff/api/audit.service';
import { Configuration } from '../../../services/admin-bff/configuration';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
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

    // OpenAPI Client Configuration
    {
      provide: Configuration,
      useFactory: (config: ConfigService) => {
        return new Configuration({
          basePath: config.get<string>(
            'CORE_API_BASE_URL',
            'https://api.example.com/admin-bff/v1',
          ),
          accessToken: () =>
            Promise.resolve(config.get<string>('CORE_API_TOKEN', '')),
        });
      },
      inject: [ConfigService],
    },

    // OpenAPI Clients
    ApprovalsApiClient,
    PointsApiClient,
    CommsApiClient,
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
