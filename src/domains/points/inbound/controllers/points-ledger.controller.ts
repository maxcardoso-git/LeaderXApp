import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { LedgerEntryType } from '../../domain';
import { PostPointsEntryCommand, ReversePointsEntryCommand } from '../../application/commands';
import {
  ListLedgerEntriesQuery,
  GetLedgerEntryQuery,
  GetMemberBalanceQuery,
} from '../../application/queries';
import {
  PostPointsEntryHandler,
  ReversePointsEntryHandler,
  ListLedgerEntriesHandler,
  GetLedgerEntryHandler,
  GetMemberBalanceHandler,
  ValidationError,
} from '../../application/handlers';
import {
  EntryNotFoundError,
  EntryAlreadyReversedError,
} from '../../application/handlers/reverse-points-entry.handler';
import { IdempotencyConflictError } from '../../outbound/repositories/idempotency.repository';
import {
  PostPointsEntryDto,
  ReversePointsEntryDto,
  ListLedgerEntriesQueryDto,
} from '../dtos';

@ApiTags('Points Ledger')
@Controller()
export class PointsLedgerController {
  constructor(
    private readonly postEntryHandler: PostPointsEntryHandler,
    private readonly reverseEntryHandler: ReversePointsEntryHandler,
    private readonly listEntriesHandler: ListLedgerEntriesHandler,
    private readonly getEntryHandler: GetLedgerEntryHandler,
    private readonly getMemberBalanceHandler: GetMemberBalanceHandler,
  ) {}

  // ============================================
  // Internal API (journey engine calls)
  // ============================================

  @Post('ledger/entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a journey-aware points ledger entry' })
  @ApiResponse({ status: 201, description: 'Entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (missing journey ref, amount, etc.)' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  async postEntry(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() dto: PostPointsEntryDto,
  ) {
    if (!idempotencyKey) {
      throw new HttpException(
        { error: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const command = new PostPointsEntryCommand(
        tenantId,
        dto.memberId,
        dto.entryType,
        dto.amount,
        dto.reasonCode,
        dto.referenceType,
        dto.referenceId,
        dto.journeyCode,
        dto.journeyTrigger,
        idempotencyKey,
        dto.approvalPolicyCode,
        dto.approvalRequestId,
        dto.sourceEventId,
        dto.metadata,
        requestId,
        actorId,
      );

      return await this.postEntryHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('ledger/entries/:id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a posted ledger entry' })
  @ApiResponse({ status: 200, description: 'Entry reversed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 409, description: 'Already reversed or idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  async reverseEntry(
    @Param('id') entryId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Body() dto: ReversePointsEntryDto,
  ) {
    if (!idempotencyKey) {
      throw new HttpException(
        { error: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const command = new ReversePointsEntryCommand(
        tenantId,
        entryId,
        dto.reasonCode,
        idempotencyKey,
        requestId,
        actorId,
      );

      return await this.reverseEntryHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================
  // Admin Read-Only API
  // ============================================

  @Get('admin/ledger/entries')
  @ApiOperation({ summary: 'List ledger entries (admin read-only)' })
  @ApiResponse({ status: 200, description: 'Entries listed successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listEntries(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ListLedgerEntriesQueryDto,
  ) {
    const query = new ListLedgerEntriesQuery(
      tenantId,
      dto.page ?? 0,
      dto.size ?? 20,
      dto.memberId,
      dto.dateFrom ? new Date(dto.dateFrom) : undefined,
      dto.dateTo ? new Date(dto.dateTo) : undefined,
      dto.entryType as LedgerEntryType | undefined,
      dto.status,
      dto.journeyCode,
    );

    return await this.listEntriesHandler.execute(query);
  }

  @Get('admin/ledger/entries/:id')
  @ApiOperation({ summary: 'Get a single ledger entry (admin read-only)' })
  @ApiResponse({ status: 200, description: 'Entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getEntry(
    @Param('id') entryId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const query = new GetLedgerEntryQuery(tenantId, entryId);
    const entry = await this.getEntryHandler.execute(query);

    if (!entry) {
      throw new HttpException(
        { error: 'ENTRY_NOT_FOUND', message: `Ledger entry ${entryId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return entry;
  }

  @Get('admin/ledger/balance/:memberId')
  @ApiOperation({ summary: 'Get derived balance for a member (admin read-only)' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getMemberBalance(
    @Param('memberId') memberId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const query = new GetMemberBalanceQuery(tenantId, memberId);
    return await this.getMemberBalanceHandler.execute(query);
  }

  private handleError(error: unknown): never {
    if (error instanceof ValidationError) {
      throw new HttpException(
        { error: error.code, message: error.message, timestamp: new Date().toISOString() },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof EntryNotFoundError) {
      throw new HttpException(
        { error: error.code, message: error.message, timestamp: new Date().toISOString() },
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof EntryAlreadyReversedError) {
      throw new HttpException(
        { error: error.code, message: error.message, timestamp: new Date().toISOString() },
        HttpStatus.CONFLICT,
      );
    }

    if (error instanceof IdempotencyConflictError) {
      throw new HttpException(
        { error: (error as { code: string }).code, message: error.message, timestamp: new Date().toISOString() },
        HttpStatus.CONFLICT,
      );
    }

    throw error;
  }
}
