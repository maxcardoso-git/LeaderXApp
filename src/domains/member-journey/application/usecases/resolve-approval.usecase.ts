import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  APPROVAL_REQUEST_REPOSITORY,
  ApprovalRequestRepository,
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  ResolveApprovalInput,
  MemberApprovalRequest,
} from '../../domain';

export interface ResolveApprovalResult {
  request: MemberApprovalRequest;
  transitionApplied: boolean;
}

@Injectable()
export class ResolveApprovalUseCase {
  private readonly logger = new Logger(ResolveApprovalUseCase.name);

  constructor(
    @Inject(APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: ApprovalRequestRepository,
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
  ) {}

  async execute(
    input: ResolveApprovalInput,
    targetState?: string,
  ): Promise<ResolveApprovalResult> {
    // Find the approval request
    const request = await this.approvalRepository.findById(
      input.tenantId,
      input.approvalRequestId,
    );

    if (!request) {
      throw new Error(`Approval request ${input.approvalRequestId} not found`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Approval request ${input.approvalRequestId} is already ${request.status}`);
    }

    this.logger.log(
      `Resolving approval ${input.approvalRequestId} with status ${input.status}`,
    );

    // Resolve the approval
    const resolvedRequest = await this.approvalRepository.resolve(input);

    let transitionApplied = false;

    // If approved and targetState provided, apply the transition
    if (input.status === 'APPROVED' && targetState) {
      const instance = await this.journeyRepository.findById(
        input.tenantId,
        request.journeyInstanceId,
      );

      if (instance) {
        // Update the state
        await this.journeyRepository.updateState(
          input.tenantId,
          request.journeyInstanceId,
          targetState,
        );

        // Log the transition
        await this.transitionLogRepository.create({
          tenantId: input.tenantId,
          journeyInstanceId: request.journeyInstanceId,
          trigger: request.journeyTrigger,
          toState: targetState,
          origin: 'APPROVAL_ENGINE',
          actorId: input.resolvedBy,
          approvalRequestId: request.id,
        });

        transitionApplied = true;
        this.logger.log(
          `Transition applied: ${instance.currentState} -> ${targetState}`,
        );
      }
    }

    return {
      request: resolvedRequest,
      transitionApplied,
    };
  }
}
