import { Injectable, Inject } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  JourneyInstanceFilters,
  MemberJourneyInstance,
  PagedResult,
} from '../../domain';

@Injectable()
export class ListJourneyInstancesUseCase {
  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
  ) {}

  async execute(filters: JourneyInstanceFilters): Promise<PagedResult<MemberJourneyInstance>> {
    return this.journeyRepository.search(filters);
  }
}
