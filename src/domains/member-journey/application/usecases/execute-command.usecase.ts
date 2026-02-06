import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  JOURNEY_DEFINITION_REPOSITORY,
  JourneyDefinitionRepository,
  ExecuteCommandInput,
  ExecuteTriggerResult,
  JourneyCommandDef,
} from '../../domain';
import { ExecuteTriggerUseCase } from './execute-trigger.usecase';

@Injectable()
export class ExecuteCommandUseCase {
  private readonly logger = new Logger(ExecuteCommandUseCase.name);

  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(JOURNEY_DEFINITION_REPOSITORY)
    private readonly definitionRepository: JourneyDefinitionRepository,
    private readonly executeTrigger: ExecuteTriggerUseCase,
  ) {}

  async execute(input: ExecuteCommandInput): Promise<ExecuteTriggerResult> {
    const journeyCode = input.journeyCode || 'MEMBER_LIFECYCLE';

    // Load the active definition
    const definition = await this.definitionRepository.findActive(
      input.tenantId,
      journeyCode,
    );

    if (!definition) {
      throw new Error(
        `No active journey definition found for code ${journeyCode}`,
      );
    }

    // Find the command definition
    const commandDef = definition.commands.find(
      (c: JourneyCommandDef) => c.command === input.command,
    );

    if (!commandDef) {
      throw new Error(
        `Unknown command "${input.command}" for journey "${journeyCode}"`,
      );
    }

    this.logger.log(
      `Executing command "${input.command}" for member ${input.memberId} (action: ${commandDef.action || 'FIRE_TRIGGER'})`,
    );

    // Handle CREATE_INSTANCE action
    if (commandDef.action === 'CREATE_INSTANCE') {
      return this.handleCreateInstance(input, definition);
    }

    // Handle RESOLVE_APPROVAL action (kanban outcomes)
    if (commandDef.action === 'RESOLVE_APPROVAL') {
      throw new Error(
        `RESOLVE_APPROVAL commands are handled via the PLM webhook, not directly`,
      );
    }

    // Default: FIRE_TRIGGER — find the member's journey instance and fire the trigger
    if (!commandDef.trigger) {
      throw new Error(
        `Command "${input.command}" has no trigger defined`,
      );
    }

    // Find the member's active journey instance
    const instance = await this.journeyRepository.findByMember(
      input.tenantId,
      input.memberId,
      journeyCode,
    );

    if (!instance) {
      throw new Error(
        `No journey instance found for member ${input.memberId} with journey code ${journeyCode}`,
      );
    }

    // Fire the trigger on the instance
    return this.executeTrigger.execute({
      tenantId: input.tenantId,
      journeyInstanceId: instance.id,
      trigger: commandDef.trigger,
      actorId: input.actorId,
      metadata: input.metadata,
    });
  }

  private async handleCreateInstance(
    input: ExecuteCommandInput,
    definition: any,
  ): Promise<ExecuteTriggerResult> {
    // Check if member already has this journey
    const existing = await this.journeyRepository.findByMember(
      input.tenantId,
      input.memberId,
      definition.code,
    );

    if (existing) {
      throw new Error(
        `Member ${input.memberId} already has an active journey "${definition.code}" (instance: ${existing.id}, state: ${existing.currentState})`,
      );
    }

    // Create the journey instance at the initial state
    const instance = await this.journeyRepository.create({
      tenantId: input.tenantId,
      memberId: input.memberId,
      journeyCode: definition.code,
      journeyVersion: definition.version,
      initialState: definition.initialState,
      metadata: input.metadata,
    });

    this.logger.log(
      `Created journey instance ${instance.id} for member ${input.memberId} at state ${definition.initialState}`,
    );

    return {
      action: 'INSTANCE_CREATED',
      instance,
      eventsEmitted: ['MEMBER_CREATED'],
    };
  }
}
