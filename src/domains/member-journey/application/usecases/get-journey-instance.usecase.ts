import { Injectable, Inject } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  MemberJourneyInstance,
  MemberJourneyTransitionLog,
} from '../../domain';

export interface JourneyInstanceWithHistory {
  instance: MemberJourneyInstance;
  transitionHistory: MemberJourneyTransitionLog[];
}

@Injectable()
export class GetJourneyInstanceUseCase {
  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
  ) {}

  async execute(
    tenantId: string,
    instanceId: string,
    includeHistory = false,
  ): Promise<JourneyInstanceWithHistory | null> {
    const instance = await this.journeyRepository.findById(tenantId, instanceId);

    if (!instance) {
      return null;
    }

    let transitionHistory: MemberJourneyTransitionLog[] = [];

    if (includeHistory) {
      const history = await this.transitionLogRepository.search({
        tenantId,
        journeyInstanceId: instanceId,
        page: 1,
        size: 100,
      });
      transitionHistory = history.items;
    }

    return {
      instance,
      transitionHistory,
    };
  }

  async executeByMember(
    tenantId: string,
    memberId: string,
    journeyCode: string,
    includeHistory = false,
  ): Promise<JourneyInstanceWithHistory | null> {
    const instance = await this.journeyRepository.findByMember(
      tenantId,
      memberId,
      journeyCode,
    );

    if (!instance) {
      return null;
    }

    let transitionHistory: MemberJourneyTransitionLog[] = [];

    if (includeHistory) {
      const history = await this.transitionLogRepository.search({
        tenantId,
        journeyInstanceId: instance.id,
        page: 1,
        size: 100,
      });
      transitionHistory = history.items;
    }

    return {
      instance,
      transitionHistory,
    };
  }
}
