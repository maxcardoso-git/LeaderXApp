import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  TransitionStateInput,
  MemberJourneyInstance,
} from '../../domain';

export interface TransitionResult {
  instance: MemberJourneyInstance;
  transitionLogId: string;
}

@Injectable()
export class TransitionStateUseCase {
  private readonly logger = new Logger(TransitionStateUseCase.name);

  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
  ) {}

  async execute(input: TransitionStateInput): Promise<TransitionResult> {
    // Find the journey instance
    const instance = await this.journeyRepository.findById(
      input.tenantId,
      input.journeyInstanceId,
    );

    if (!instance) {
      throw new Error(`Journey instance ${input.journeyInstanceId} not found`);
    }

    const fromState = instance.currentState;

    this.logger.log(
      `Transitioning journey ${instance.id} from ${fromState} to ${input.toState} via trigger ${input.trigger}`,
    );

    // Update the state
    const updatedInstance = await this.journeyRepository.updateState(
      input.tenantId,
      input.journeyInstanceId,
      input.toState,
    );

    // Log the transition
    const transitionLog = await this.transitionLogRepository.create(input);

    return {
      instance: updatedInstance,
      transitionLogId: transitionLog.id,
    };
  }
}
