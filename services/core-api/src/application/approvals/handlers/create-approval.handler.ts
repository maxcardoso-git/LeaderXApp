import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateApprovalCommand } from '../commands';
import {
  Approval,
  Priority,
  APPROVAL_REPOSITORY,
  ApprovalRepositoryPort,
} from '@domain/approvals';

export interface CreateApprovalResult {
  id: string;
  type: string;
  state: string;
  candidateId: string;
  candidateName?: string;
  priority: string;
  createdAt: Date;
}

@CommandHandler(CreateApprovalCommand)
export class CreateApprovalHandler
  implements ICommandHandler<CreateApprovalCommand, CreateApprovalResult>
{
  constructor(
    @Inject(APPROVAL_REPOSITORY)
    private readonly approvalRepository: ApprovalRepositoryPort,
  ) {}

  async execute(command: CreateApprovalCommand): Promise<CreateApprovalResult> {
    const approval = Approval.create({
      type: command.type,
      candidateId: command.candidateId,
      candidateName: command.candidateName,
      priority: Priority.fromString(command.priority),
      tenantId: command.tenantId,
      orgId: command.orgId,
      cycleId: command.cycleId,
      metadata: command.metadata,
    });

    await this.approvalRepository.save(approval);

    return {
      id: approval.id.toString(),
      type: approval.type,
      state: approval.state.toString(),
      candidateId: approval.candidateId,
      candidateName: approval.candidateName,
      priority: approval.priority.toString(),
      createdAt: approval.createdAt,
    };
  }
}
