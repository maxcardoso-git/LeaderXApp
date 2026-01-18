import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, Logger } from '@nestjs/common';
import { DecideApprovalCommand } from '../commands';
import {
  ApprovalId,
  APPROVAL_REPOSITORY,
  ApprovalRepositoryPort,
} from '@domain/approvals';

export interface DecideApprovalResult {
  id: string;
  status: string;
  message: string;
  newState: string;
}

@CommandHandler(DecideApprovalCommand)
export class DecideApprovalHandler
  implements ICommandHandler<DecideApprovalCommand, DecideApprovalResult>
{
  private readonly logger = new Logger(DecideApprovalHandler.name);

  constructor(
    @Inject(APPROVAL_REPOSITORY)
    private readonly approvalRepository: ApprovalRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DecideApprovalCommand): Promise<DecideApprovalResult> {
    const approvalId = ApprovalId.fromString(command.approvalId);

    const approval = await this.approvalRepository.findById(
      approvalId,
      command.tenantId,
    );

    if (!approval) {
      throw new NotFoundException(`Approval ${command.approvalId} not found`);
    }

    // Apply the decision (this will add domain event internally)
    approval.decide(command.decision, command.decidedBy, command.reason);

    // Save the approval
    await this.approvalRepository.save(approval);

    // Publish domain events
    const events = approval.pullDomainEvents();
    for (const event of events) {
      this.logger.log(`Publishing event: ${event.constructor.name}`);
      this.eventBus.publish(event);
    }

    return {
      id: approval.id.toString(),
      status: 'DECIDED',
      message: `Approval ${approval.id.toString()} decided as ${command.decision}`,
      newState: approval.state.toString(),
    };
  }
}
