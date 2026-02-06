import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  JOURNEY_INSTANCE_REPOSITORY,
  JourneyInstanceRepository,
  JOURNEY_DEFINITION_REPOSITORY,
  JourneyDefinitionRepository,
  TRANSITION_LOG_REPOSITORY,
  TransitionLogRepository,
  APPROVAL_REQUEST_REPOSITORY,
  ApprovalRequestRepository,
  PLM_INTEGRATION_PORT,
  PlmIntegrationPort,
  GOVERNANCE_POLICY_PORT,
  GovernancePolicyPort,
  ExecuteTriggerInput,
  ExecuteTriggerResult,
  JourneyTransitionDef,
} from '../../domain';

@Injectable()
export class ExecuteTriggerUseCase {
  private readonly logger = new Logger(ExecuteTriggerUseCase.name);

  constructor(
    @Inject(JOURNEY_INSTANCE_REPOSITORY)
    private readonly journeyRepository: JourneyInstanceRepository,
    @Inject(JOURNEY_DEFINITION_REPOSITORY)
    private readonly definitionRepository: JourneyDefinitionRepository,
    @Inject(TRANSITION_LOG_REPOSITORY)
    private readonly transitionLogRepository: TransitionLogRepository,
    @Inject(APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: ApprovalRequestRepository,
    @Inject(PLM_INTEGRATION_PORT)
    private readonly plmIntegration: PlmIntegrationPort,
    @Inject(GOVERNANCE_POLICY_PORT)
    private readonly governancePolicy: GovernancePolicyPort,
  ) {}

  async execute(input: ExecuteTriggerInput): Promise<ExecuteTriggerResult> {
    // 1. Load the journey instance
    const instance = await this.journeyRepository.findById(
      input.tenantId,
      input.journeyInstanceId,
    );

    if (!instance) {
      throw new Error(
        `Journey instance ${input.journeyInstanceId} not found`,
      );
    }

    // 2. Load the active journey definition
    const definition = await this.definitionRepository.findActive(
      input.tenantId,
      instance.journeyCode,
    );

    if (!definition) {
      throw new Error(
        `No active journey definition found for code ${instance.journeyCode}`,
      );
    }

    // 3. Find the matching transition for current state + trigger
    const transition = definition.transitions.find(
      (t: JourneyTransitionDef) =>
        t.trigger === input.trigger && t.from === instance.currentState,
    );

    if (!transition) {
      throw new Error(
        `No valid transition found for trigger "${input.trigger}" from state "${instance.currentState}" in journey "${instance.journeyCode}"`,
      );
    }

    this.logger.log(
      `Executing trigger "${input.trigger}" on instance ${instance.id}: ${transition.from} -> ${transition.to} (approval: ${transition.requiresApproval})`,
    );

    // 4. If requires approval, create approval request + PLM card
    if (transition.requiresApproval && transition.approvalPolicyCode) {
      return this.handleApprovalFlow(input, instance, transition, definition);
    }

    // 5. Direct transition (no approval needed)
    return this.handleDirectTransition(input, instance, transition);
  }

  private async handleApprovalFlow(
    input: ExecuteTriggerInput,
    instance: any,
    transition: JourneyTransitionDef,
    definition: any,
  ): Promise<ExecuteTriggerResult> {
    // Resolve pipelineId from governance policy
    let pipelineId: string | undefined;
    if (transition.approvalPolicyCode) {
      const policy = await this.governancePolicy.findByCode(
        transition.approvalPolicyCode,
      );
      if (policy) {
        pipelineId = policy.pipelineId;
        this.logger.log(
          `Resolved pipelineId ${pipelineId} from policy ${transition.approvalPolicyCode}`,
        );
      }
    }

    // Create the approval request
    const request = await this.approvalRepository.create({
      tenantId: input.tenantId,
      memberId: instance.memberId,
      journeyInstanceId: instance.id,
      journeyTrigger: input.trigger,
      policyCode: transition.approvalPolicyCode!,
      metadata: {
        ...input.metadata,
        targetState: transition.to,
        transitionKey: transition.key,
        effects: transition.effects,
      },
    });

    // Create PLM card if pipeline available
    if (pipelineId) {
      try {
        const { cardId } = await this.plmIntegration.createCard({
          tenantId: input.tenantId,
          pipelineId,
          title: `[${input.trigger}] Member ${instance.memberId}`,
          description: `Approval for: ${transition.key}\nFrom: ${transition.from} → To: ${transition.to}\nPolicy: ${transition.approvalPolicyCode}`,
          priority: 'MEDIUM',
          metadata: {
            approvalRequestId: request.id,
            memberId: instance.memberId,
            journeyInstanceId: instance.id,
            journeyTrigger: input.trigger,
            targetState: transition.to,
            transitionKey: transition.key,
            policyCode: transition.approvalPolicyCode,
            ...input.metadata,
          },
        });

        await this.approvalRepository.updateKanbanCardId(
          input.tenantId,
          request.id,
          cardId,
        );

        this.logger.log(
          `Approval ${request.id} linked to PLM card ${cardId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create PLM card for approval ${request.id}: ${error.message}`,
        );
      }
    }

    // Log the trigger event (transition pending approval)
    const log = await this.transitionLogRepository.create({
      tenantId: input.tenantId,
      journeyInstanceId: instance.id,
      trigger: input.trigger,
      toState: instance.currentState, // State doesn't change yet
      origin: input.actorId ? 'ADMIN' : 'SYSTEM',
      actorId: input.actorId,
      approvalRequestId: request.id,
      metadata: {
        ...input.metadata,
        pendingApproval: true,
        targetState: transition.to,
      },
    });

    return {
      action: 'APPROVAL_REQUESTED',
      instance,
      transitionLogId: log.id,
      approvalRequestId: request.id,
      eventsEmitted: [],
    };
  }

  private async handleDirectTransition(
    input: ExecuteTriggerInput,
    instance: any,
    transition: JourneyTransitionDef,
  ): Promise<ExecuteTriggerResult> {
    // Apply state change
    const updatedInstance = await this.journeyRepository.updateState(
      input.tenantId,
      instance.id,
      transition.to,
    );

    // Log the transition
    const log = await this.transitionLogRepository.create({
      tenantId: input.tenantId,
      journeyInstanceId: instance.id,
      trigger: input.trigger,
      toState: transition.to,
      origin: input.actorId ? 'ADMIN' : 'SYSTEM',
      actorId: input.actorId,
      metadata: {
        ...input.metadata,
        transitionKey: transition.key,
        fromState: transition.from,
      },
    });

    // Collect emitted events (placeholder for future event bus)
    const eventsEmitted = transition.effects?.emitEvents || [];
    if (eventsEmitted.length > 0) {
      this.logger.log(
        `Events to emit: ${eventsEmitted.join(', ')} (future implementation)`,
      );
    }

    return {
      action: 'TRANSITIONED',
      instance: updatedInstance,
      transitionLogId: log.id,
      eventsEmitted,
    };
  }
}
