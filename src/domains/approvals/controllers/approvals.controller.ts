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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalsFacade } from '../facades/approvals.facade';
import { ErrorResponse } from '../../../common/errors/error-response.interface';

// DTOs
class DecisionDto {
  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_CHANGES'])
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

  @IsOptional()
  @IsString()
  reason?: string;
}

class BulkDecisionDto {
  @IsArray()
  @IsString({ each: true })
  approvalIds: string[];

  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_CHANGES'])
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
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly facade: ApprovalsFacade) {}

  @Get()
  @ApiOperation({ summary: 'List approval requests with filters' })
  @ApiResponse({ status: 200, description: 'Paged list of approvals' })
  @ApiResponse({ status: 400, type: ErrorResponse })
  @ApiResponse({ status: 401, type: ErrorResponse })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false })
  async list(@Query() query: ListQueryDto) {
    return this.facade.list({
      state: query.state,
      type: query.type,
      priority: query.priority,
      q: query.q,
      page: query.page,
      size: query.size,
      sort: query.sort,
    });
  }

  @Get(':approvalId')
  @ApiOperation({ summary: 'Get approval request details' })
  @ApiResponse({ status: 200, description: 'Approval details' })
  @ApiResponse({ status: 404, type: ErrorResponse })
  @ApiResponse({ status: 401, type: ErrorResponse })
  @ApiParam({ name: 'approvalId', type: 'string' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async getById(@Param('approvalId') approvalId: string) {
    return this.facade.getById(approvalId);
  }

  @Post(':approvalId/decide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decide an approval request (approve/reject/request changes)',
    description: 'Idempotent operation - requires Idempotency-Key header',
  })
  @ApiResponse({ status: 200, description: 'Decision applied successfully' })
  @ApiResponse({
    status: 409,
    description: 'Request with same Idempotency-Key is still processing',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 404, type: ErrorResponse })
  @ApiResponse({ status: 400, type: ErrorResponse })
  @ApiParam({ name: 'approvalId', type: 'string' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async decide(
    @Param('approvalId') approvalId: string,
    @Body() body: DecisionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.facade.decide({
      approvalId,
      decision: body.decision,
      reason: body.reason,
      idempotencyKey,
    });
  }

  @Post('bulk-decide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk decide multiple approval requests',
    description: 'Idempotent operation - requires Idempotency-Key header',
  })
  @ApiResponse({ status: 200, description: 'Bulk decision results' })
  @ApiResponse({
    status: 409,
    description: 'Request with same Idempotency-Key is still processing',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 400, type: ErrorResponse })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Org-Id', required: true })
  @ApiHeader({ name: 'X-Cycle-Id', required: false })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async decideBulk(
    @Body() body: BulkDecisionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.facade.decideBulk({
      approvalIds: body.approvalIds,
      decision: body.decision,
      reason: body.reason,
      idempotencyKey,
    });
  }
}
