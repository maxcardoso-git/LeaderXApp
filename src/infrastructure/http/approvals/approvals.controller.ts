import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsObject, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  CreateApprovalCommand,
  DecideApprovalCommand,
  GetApprovalQuery,
  ListApprovalsQuery,
} from '@application/approvals';

// DTOs
class CreateApprovalDto {
  @IsString()
  type: string;

  @IsString()
  candidateId: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsString()
  priority: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class DecisionDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_CHANGES'])
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

  @IsOptional()
  @IsString()
  reason?: string;
}

class ListQueryDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List approval requests with filters' })
  @ApiResponse({ status: 200, description: 'Paged list of approvals' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-org-id') orgId: string,
    @Headers('x-cycle-id') cycleId: string | undefined,
    @Query() query: ListQueryDto,
  ) {
    return this.queryBus.execute(
      new ListApprovalsQuery(
        tenantId,
        orgId,
        query.page || 0,
        query.size || 10,
        query.state,
        query.type,
        query.priority,
        cycleId,
        query.q,
        query.sort,
      ),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create approval request' })
  @ApiResponse({ status: 201, description: 'Approval created' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-org-id') orgId: string,
    @Headers('x-cycle-id') cycleId: string | undefined,
    @Body() body: CreateApprovalDto,
  ) {
    return this.commandBus.execute(
      new CreateApprovalCommand(
        body.type,
        body.candidateId,
        body.priority,
        tenantId,
        orgId,
        body.candidateName,
        cycleId,
        body.metadata,
      ),
    );
  }

  @Get(':approvalId')
  @ApiOperation({ summary: 'Get approval request details' })
  @ApiResponse({ status: 200, description: 'Approval details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiParam({ name: 'approvalId', type: 'string' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.queryBus.execute(new GetApprovalQuery(approvalId, tenantId));
  }

  @Post(':approvalId/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decide an approval request' })
  @ApiResponse({ status: 200, description: 'Decision applied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiParam({ name: 'approvalId', type: 'string' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async decide(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-org-id') orgId: string,
    @Headers('x-actor-id') actorId: string | undefined,
    @Param('approvalId') approvalId: string,
    @Body() body: DecisionDto,
  ) {
    return this.commandBus.execute(
      new DecideApprovalCommand(
        approvalId,
        body.decision,
        actorId || 'system',
        tenantId,
        orgId,
        body.reason,
      ),
    );
  }
}
