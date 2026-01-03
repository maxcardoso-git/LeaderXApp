import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { EventHandler } from '../../../common/eventing/domain-event.interface';
import { RetryService } from '../../../common/retry/retry.service';
import { RETRY_PRESETS } from '../../../common/retry/retry.config';
import {
  ApprovalDecidedEvent,
  APPROVAL_DECIDED_EVENT,
} from '../events/approval-decided.event';
import { AuditService } from '../../../../services/admin-bff/api/audit.service';

@Injectable()
export class AuditOnApprovalDecidedHandler
  implements EventHandler<ApprovalDecidedEvent>
{
  readonly eventType = APPROVAL_DECIDED_EVENT;
  private readonly logger = new Logger(AuditOnApprovalDecidedHandler.name);

  constructor(
    private readonly auditApi: AuditService,
    private readonly retryService: RetryService,
  ) {}

  async handle(event: ApprovalDecidedEvent): Promise<void> {
    this.logger.log(
      `Creating audit log for approval decision: ${event.aggregateId}`,
    );

    await this.retryService.execute(
      async () => {
        const response = await firstValueFrom(
          this.auditApi.appendAuditLog({
            xTenantId: event.tenantId,
            xOrgId: event.orgId,
            xRequestId: event.correlationId,
            auditLogItem: {
              action: 'APPROVAL_DECIDED',
              entityType: 'APPROVAL',
              entityId: event.aggregateId,
              actorId: event.decidedBy,
              timestamp: event.occurredAt.toISOString(),
              changes: {
                decision: event.decision,
                reason: event.reason,
              },
              metadata: {
                approvalType: event.approvalType,
                candidateId: event.candidateId,
                candidateName: event.candidateName,
                cycleId: event.cycleId,
                correlationId: event.correlationId,
              },
            },
          }),
        );

        this.logger.log(
          `Audit log created for approval ${event.aggregateId}`,
          { auditId: response.data },
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
