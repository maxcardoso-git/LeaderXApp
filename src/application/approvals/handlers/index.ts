export * from './create-approval.handler';
export * from './decide-approval.handler';
export * from './get-approval.handler';
export * from './list-approvals.handler';

import { CreateApprovalHandler } from './create-approval.handler';
import { DecideApprovalHandler } from './decide-approval.handler';
import { GetApprovalHandler } from './get-approval.handler';
import { ListApprovalsHandler } from './list-approvals.handler';

export const CommandHandlers = [CreateApprovalHandler, DecideApprovalHandler];

export const QueryHandlers = [GetApprovalHandler, ListApprovalsHandler];
