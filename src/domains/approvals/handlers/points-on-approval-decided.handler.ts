import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { EventHandler } from '../../../common/eventing/domain-event.interface';
import { RetryService } from '../../../common/retry/retry.service';
import { RETRY_PRESETS } from '../../../common/retry/retry.config';
import {
  ApprovalDecidedEvent,
  APPROVAL_DECIDED_EVENT,
} from '../events/approval-decided.event';
import { PointsService } from '../../../../services/admin-bff/api/points.service';

@Injectable()
export class PointsOnApprovalDecidedHandler
  implements EventHandler<ApprovalDecidedEvent>
{
  readonly eventType = APPROVAL_DECIDED_EVENT;
  private readonly logger = new Logger(PointsOnApprovalDecidedHandler.name);

  constructor(
    private readonly pointsApi: PointsService,
    private readonly retryService: RetryService,
  ) {}

  async handle(event: ApprovalDecidedEvent): Promise<void> {
    // Only process approved decisions
    if (event.decision !== 'APPROVED') {
      this.logger.debug(
        `Skipping points recalculation for non-approved decision: ${event.aggregateId}`,
      );
      return;
    }

    this.logger.log(
      `Processing points recalculation for approval: ${event.aggregateId}`,
    );

    await this.retryService.execute(
      async () => {
        const response = await firstValueFrom(
          this.pointsApi.pointsRecalculate({
            xTenantId: event.tenantId,
            xOrgId: event.orgId,
            xCycleId: event.cycleId,
            xRequestId: event.correlationId,
            pointsRecalculateRequest: {
              reason: 'APPROVAL_DECIDED',
              metadata: {
                approvalId: event.aggregateId,
                approvalType: event.approvalType,
                decidedBy: event.decidedBy,
              },
            },
          }),
        );

        this.logger.log(
          `Points recalculation triggered for approval ${event.aggregateId}`,
          { jobId: response.data },
        );
      },
      {
        ...RETRY_PRESETS.AGGRESSIVE,
        maxAttempts: 5,
      },
      `points-recalculate:${event.aggregateId}`,
    );
  }
}
