import { Injectable, Inject } from '@nestjs/common';
import {
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  TransitionLogFilters,
  MemberJourneyTransitionLog,
  PagedResult,
} from '../../domain';

@Injectable()
export class ListTransitionLogsUseCase {
  constructor(
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
  ) {}

  async execute(filters: TransitionLogFilters): Promise<PagedResult<MemberJourneyTransitionLog>> {
    return this.transitionLogRepository.search(filters);
  }
}
