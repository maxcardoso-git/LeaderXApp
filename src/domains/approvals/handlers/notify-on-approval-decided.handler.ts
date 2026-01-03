import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { EventHandler } from '../../../common/eventing/domain-event.interface';
import { RetryService } from '../../../common/retry/retry.service';
import { RETRY_PRESETS } from '../../../common/retry/retry.config';
import {
  ApprovalDecidedEvent,
  APPROVAL_DECIDED_EVENT,
} from '../events/approval-decided.event';
import { CommunicationsService } from '../../../../services/admin-bff/api/communications.service';

@Injectable()
export class NotifyOnApprovalDecidedHandler
  implements EventHandler<ApprovalDecidedEvent>
{
  readonly eventType = APPROVAL_DECIDED_EVENT;
  private readonly logger = new Logger(NotifyOnApprovalDecidedHandler.name);

  constructor(
    private readonly commsApi: CommunicationsService,
    private readonly retryService: RetryService,
  ) {}

  async handle(event: ApprovalDecidedEvent): Promise<void> {
    this.logger.log(
      `Sending notification for approval decision: ${event.aggregateId}`,
    );

    const notificationType =
      event.decision === 'APPROVED'
        ? 'APPROVAL_APPROVED'
        : event.decision === 'REJECTED'
          ? 'APPROVAL_REJECTED'
          : 'APPROVAL_CHANGES_REQUESTED';

    await this.retryService.execute(
      async () => {
        const response = await firstValueFrom(
          this.commsApi.createNotification({
            xTenantId: event.tenantId,
            xOrgId: event.orgId,
            xRequestId: event.correlationId,
            createNotificationRequest: {
              type: notificationType,
              title: this.getNotificationTitle(event),
              message: this.getNotificationMessage(event),
              priority: 'NORMAL',
              channels: ['IN_APP', 'EMAIL'],
              metadata: {
                approvalId: event.aggregateId,
                approvalType: event.approvalType,
                decision: event.decision,
                decidedBy: event.decidedBy,
                reason: event.reason,
              },
            },
          }),
        );

        this.logger.log(
          `Notification sent for approval ${event.aggregateId}`,
          { notificationId: response.data },
        );
      },
      {
        ...RETRY_PRESETS.STANDARD,
        maxAttempts: 4,
      },
      `notify-approval:${event.aggregateId}`,
    );
  }

  private getNotificationTitle(event: ApprovalDecidedEvent): string {
    switch (event.decision) {
      case 'APPROVED':
        return 'Aprovação Concedida';
      case 'REJECTED':
        return 'Aprovação Negada';
      case 'CHANGES_REQUESTED':
        return 'Alterações Solicitadas';
      default:
        return 'Decisão de Aprovação';
    }
  }

  private getNotificationMessage(event: ApprovalDecidedEvent): string {
    const baseMessage = `A solicitação de ${event.approvalType} foi `;

    switch (event.decision) {
      case 'APPROVED':
        return `${baseMessage}aprovada.`;
      case 'REJECTED':
        return `${baseMessage}rejeitada.${event.reason ? ` Motivo: ${event.reason}` : ''}`;
      case 'CHANGES_REQUESTED':
        return `${baseMessage}devolvida para alterações.${event.reason ? ` Observações: ${event.reason}` : ''}`;
      default:
        return `${baseMessage}processada.`;
    }
  }
}
