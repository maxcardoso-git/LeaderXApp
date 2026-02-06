import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  APPROVAL_REQUEST_REPOSITORY,
  ApprovalRequestRepository,
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  PLM_INTEGRATION_PORT,
  PlmIntegrationPort,
  CreateApprovalRequestInput,
  MemberApprovalRequest,
} from '../../domain';

@Injectable()
export class CreateApprovalRequestUseCase {
  private readonly logger = new Logger(CreateApprovalRequestUseCase.name);

  constructor(
    @Inject(APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: ApprovalRequestRepository,
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(PLM_INTEGRATION_PORT)
    private readonly plmIntegration: PlmIntegrationPort,
  ) {}

  async execute(input: CreateApprovalRequestInput): Promise<MemberApprovalRequest> {
    // Verify journey instance exists
    const instance = await this.journeyRepository.findById(
      input.tenantId,
      input.journeyInstanceId,
    );

    if (!instance) {
      throw new Error(`Journey instance ${input.journeyInstanceId} not found`);
    }

    this.logger.log(
      `Creating approval request for member ${input.memberId}, trigger: ${input.journeyTrigger}`,
    );

    // Create the approval request
    const request = await this.approvalRepository.create(input);

    // If pipelineId provided, create a PLM card for kanban-based approval
    if (input.pipelineId) {
      try {
        const { cardId } = await this.plmIntegration.createCard({
          tenantId: input.tenantId,
          pipelineId: input.pipelineId,
          title: `[${input.journeyTrigger}] Member ${input.memberId}`,
          description: `Approval request for journey trigger: ${input.journeyTrigger}\nPolicy: ${input.policyCode}`,
          priority: 'MEDIUM',
          metadata: {
            approvalRequestId: request.id,
            memberId: input.memberId,
            journeyInstanceId: input.journeyInstanceId,
            journeyTrigger: input.journeyTrigger,
            policyCode: input.policyCode,
            ...input.metadata,
          },
        });

        // Update the approval request with the kanban card ID
        await this.approvalRepository.updateKanbanCardId(
          input.tenantId,
          request.id,
          cardId,
        );

        request.kanbanCardId = cardId;

        this.logger.log(
          `Linked approval ${request.id} to PLM card ${cardId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create PLM card for approval ${request.id}: ${error.message}`,
        );
        // Don't fail the approval request creation if PLM card creation fails
      }
    }

    return request;
  }
}
