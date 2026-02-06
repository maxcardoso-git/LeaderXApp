import { Injectable, Inject } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  CreateJourneyInstanceInput,
  MemberJourneyInstance,
} from '../../domain';

@Injectable()
export class CreateJourneyInstanceUseCase {
  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
  ) {}

  async execute(input: CreateJourneyInstanceInput): Promise<MemberJourneyInstance> {
    // Check if journey already exists for this member
    const existing = await this.journeyRepository.findByMember(
      input.tenantId,
      input.memberId,
      input.journeyCode,
    );

    if (existing) {
      throw new Error(`Journey ${input.journeyCode} already exists for member ${input.memberId}`);
    }

    // Create the journey instance
    const instance = await this.journeyRepository.create(input);

    // Log the initial transition
    await this.transitionLogRepository.create({
      tenantId: input.tenantId,
      journeyInstanceId: instance.id,
      trigger: 'JOURNEY_STARTED',
      toState: input.initialState,
      origin: 'SYSTEM',
      metadata: input.metadata,
    });

    return instance;
  }
}
