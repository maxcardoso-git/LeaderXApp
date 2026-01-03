import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { EventHandler } from '../../../common/eventing/domain-event.interface';
import { RetryService } from '../../../common/retry/retry.service';
import { RETRY_PRESETS } from '../../../common/retry/retry.config';
import {
  ApprovalDecidedEvent,
  APPROVAL_DECIDED_EVENT,
} from '../events/approval-decided.event';
import { AuditApiClient } from '../../../infrastructure/openapi-clients';

@Injectable()
export class AuditOnApprovalDecidedHandler
  implements EventHandler<ApprovalDecidedEvent>
{
  readonly eventType = APPROVAL_DECIDED_EVENT;
  private readonly logger = new Logger(AuditOnApprovalDecidedHandler.name);

  constructor(
    private readonly auditApi: AuditApiClient,
    private readonly retryService: RetryService,
  ) {}

  async handle(event: ApprovalDecidedEvent): Promise<void> {
    this.logger.log(
      `Creating audit log for approval decision: ${event.aggregateId}`,
    );

    await this.retryService.execute(
      async () => {
        const response = await firstValueFrom(
          this.auditApi.createAuditLog({
            xTenantId: event.tenantId,
            xOrgId: event.orgId,
            xRequestId: event.correlationId,
            body: {
              action: 'APPROVAL_DECIDED',
              resourceType: 'APPROVAL',
              resourceId: event.aggregateId,
              actorId: event.decidedBy,
              timestamp: event.occurredAt.toISOString(),
              correlationId: event.correlationId,
              metadata: {
                approvalType: event.approvalType,
                decision: event.decision,
                reason: event.reason,
                cycleId: event.cycleId,
              },
            },
          }),
        );

        this.logger.log(
          `Audit log created for approval ${event.aggregateId}`,
          { auditId: response.data.auditLogId },
        );
      },
      {
        ...RETRY_PRESETS.STANDARD,
        maxAttempts: 4,
      },
      `audit-approval:${event.aggregateId}`,
    );
  }
}
