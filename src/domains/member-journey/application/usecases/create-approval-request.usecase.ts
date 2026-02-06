import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  APPROVAL_REQUEST_REPOSITORY,
  ApprovalRequestRepository,
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
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

    return request;
  }
}
