import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import {
  CreateJourneyInstanceUseCase,
  TransitionStateUseCase,
  CreateApprovalRequestUseCase,
  ResolveApprovalUseCase,
  ListJourneyInstancesUseCase,
  GetJourneyInstanceUseCase,
  ListApprovalRequestsUseCase,
  ListTransitionLogsUseCase,
} from '../../application/usecases';
import { JourneyTransitionOrigin, ApprovalStatus } from '../../domain';

// ============================================
// DTOs
// ============================================

class CreateJourneyInstanceDto {
  memberId: string;
  journeyCode: string;
  journeyVersion?: string;
  initialState: string;
  metadata?: Record<string, unknown>;
}

class TransitionStateDto {
  trigger: string;
  toState: string;
  origin: JourneyTransitionOrigin;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

class CreateApprovalRequestDto {
  memberId: string;
  journeyInstanceId: string;
  journeyTrigger: string;
  policyCode: string;
  kanbanCardId?: string;
  metadata?: Record<string, unknown>;
}

class ResolveApprovalDto {
  status: 'APPROVED' | 'REJECTED';
  resolvedBy: string;
  targetState?: string;
}

// ============================================
// Controller
// ============================================

@ApiTags('Member Journey')
@Controller('member-journey')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class MemberJourneyController {
  constructor(
    private readonly createJourneyInstance: CreateJourneyInstanceUseCase,
    private readonly transitionState: TransitionStateUseCase,
    private readonly createApprovalRequest: CreateApprovalRequestUseCase,
    private readonly resolveApproval: ResolveApprovalUseCase,
    private readonly listJourneyInstances: ListJourneyInstancesUseCase,
    private readonly getJourneyInstance: GetJourneyInstanceUseCase,
    private readonly listApprovalRequests: ListApprovalRequestsUseCase,
    private readonly listTransitionLogs: ListTransitionLogsUseCase,
  ) {}

  // ============================================
  // Journey Instances
  // ============================================

  @Post('instances')
  @ApiOperation({ summary: 'Create a new journey instance for a member' })
  async createInstance(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateJourneyInstanceDto,
  ) {
    try {
      return await this.createJourneyInstance.execute({
        tenantId,
        memberId: dto.memberId,
        journeyCode: dto.journeyCode,
        journeyVersion: dto.journeyVersion,
        initialState: dto.initialState,
        metadata: dto.metadata,
      });
    } catch (error) {
      throw new HttpException(
        { error: 'JOURNEY_CREATION_FAILED', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('instances')
  @ApiOperation({ summary: 'List journey instances' })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'journeyCode', required: false })
  @ApiQuery({ name: 'currentState', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  async listInstances(
    @Headers('x-tenant-id') tenantId: string,
    @Query('memberId') memberId?: string,
    @Query('journeyCode') journeyCode?: string,
    @Query('currentState') currentState?: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
  ) {
    return this.listJourneyInstances.execute({
      tenantId,
      memberId,
      journeyCode,
      currentState,
      page: Number(page),
      size: Number(size),
    });
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get journey instance by ID' })
  @ApiQuery({ name: 'includeHistory', required: false })
  async getInstance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('includeHistory') includeHistory = 'false',
  ) {
    const result = await this.getJourneyInstance.execute(
      tenantId,
      id,
      includeHistory === 'true',
    );

    if (!result) {
      throw new HttpException(
        { error: 'JOURNEY_INSTANCE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  @Get('members/:memberId/journey/:journeyCode')
  @ApiOperation({ summary: 'Get journey instance by member and journey code' })
  @ApiQuery({ name: 'includeHistory', required: false })
  async getInstanceByMember(
    @Headers('x-tenant-id') tenantId: string,
    @Param('memberId') memberId: string,
    @Param('journeyCode') journeyCode: string,
    @Query('includeHistory') includeHistory = 'false',
  ) {
    const result = await this.getJourneyInstance.executeByMember(
      tenantId,
      memberId,
      journeyCode,
      includeHistory === 'true',
    );

    if (!result) {
      throw new HttpException(
        { error: 'JOURNEY_INSTANCE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  @Put('instances/:id/transition')
  @ApiOperation({ summary: 'Transition journey state' })
  async transition(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: TransitionStateDto,
  ) {
    try {
      return await this.transitionState.execute({
        tenantId,
        journeyInstanceId: id,
        trigger: dto.trigger,
        toState: dto.toState,
        origin: dto.origin,
        actorId: dto.actorId,
        metadata: dto.metadata,
      });
    } catch (error) {
      throw new HttpException(
        { error: 'TRANSITION_FAILED', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ============================================
  // Transition Logs
  // ============================================

  @Get('transition-logs')
  @ApiOperation({ summary: 'List transition logs' })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'journeyInstanceId', required: false })
  @ApiQuery({ name: 'trigger', required: false })
  @ApiQuery({ name: 'origin', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  async listLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Query('memberId') memberId?: string,
    @Query('journeyInstanceId') journeyInstanceId?: string,
    @Query('trigger') trigger?: string,
    @Query('origin') origin?: JourneyTransitionOrigin,
    @Query('page') page = 1,
    @Query('size') size = 25,
  ) {
    return this.listTransitionLogs.execute({
      tenantId,
      memberId,
      journeyInstanceId,
      trigger,
      origin,
      page: Number(page),
      size: Number(size),
    });
  }

  // ============================================
  // Approval Requests
  // ============================================

  @Post('approvals')
  @ApiOperation({ summary: 'Create approval request' })
  async createApproval(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateApprovalRequestDto,
  ) {
    try {
      return await this.createApprovalRequest.execute({
        tenantId,
        memberId: dto.memberId,
        journeyInstanceId: dto.journeyInstanceId,
        journeyTrigger: dto.journeyTrigger,
        policyCode: dto.policyCode,
        kanbanCardId: dto.kanbanCardId,
        metadata: dto.metadata,
      });
    } catch (error) {
      throw new HttpException(
        { error: 'APPROVAL_REQUEST_FAILED', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List approval requests' })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'journeyInstanceId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'policyCode', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  async listApprovals(
    @Headers('x-tenant-id') tenantId: string,
    @Query('memberId') memberId?: string,
    @Query('journeyInstanceId') journeyInstanceId?: string,
    @Query('status') status?: ApprovalStatus,
    @Query('policyCode') policyCode?: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
  ) {
    return this.listApprovalRequests.execute({
      tenantId,
      memberId,
      journeyInstanceId,
      status,
      policyCode,
      page: Number(page),
      size: Number(size),
    });
  }

  @Get('members/:memberId/pending-approvals')
  @ApiOperation({ summary: 'Get pending approvals for a member' })
  async getPendingApprovals(
    @Headers('x-tenant-id') tenantId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.listApprovalRequests.getPendingByMember(tenantId, memberId);
  }

  @Put('approvals/:id/resolve')
  @ApiOperation({ summary: 'Resolve approval request' })
  async resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ResolveApprovalDto,
  ) {
    try {
      return await this.resolveApproval.execute(
        {
          tenantId,
          approvalRequestId: id,
          status: dto.status,
          resolvedBy: dto.resolvedBy,
        },
        dto.targetState,
      );
    } catch (error) {
      throw new HttpException(
        { error: 'RESOLVE_APPROVAL_FAILED', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
