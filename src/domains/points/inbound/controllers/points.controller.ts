import {
  Controller,
  Get,
  Post,
  Body,
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
import {
  CreditPointsCommand,
  DebitPointsCommand,
  HoldPointsCommand,
  ReleaseHoldCommand,
  CommitHoldCommand,
} from '../../application/commands';
import { GetBalanceQuery, GetStatementQuery } from '../../application/queries';
import {
  CreditPointsHandler,
  DebitPointsHandler,
  HoldPointsHandler,
  ReleaseHoldHandler,
  CommitHoldHandler,
  GetBalanceHandler,
  GetStatementHandler,
  ValidationError,
} from '../../application/handlers';
import { InsufficientFundsError } from '../../application/handlers/debit-points.handler';
import { HoldAlreadyExistsError, HoldNotActiveError } from '../../application/handlers/hold-points.handler';
import { HoldNotFoundError } from '../../application/handlers/release-hold.handler';
import { IdempotencyConflictError } from '../../outbound/repositories/idempotency.repository';
import {
  CreditPointsDto,
  DebitPointsDto,
  HoldPointsDto,
  ReleaseHoldDto,
  CommitHoldDto,
  GetBalanceQueryDto,
  GetStatementQueryDto,
} from '../dtos';

@ApiTags('Points')
@Controller('points')
export class PointsController {
  constructor(
    private readonly creditHandler: CreditPointsHandler,
    private readonly debitHandler: DebitPointsHandler,
    private readonly holdHandler: HoldPointsHandler,
    private readonly releaseHandler: ReleaseHoldHandler,
    private readonly commitHandler: CommitHoldHandler,
    private readonly balanceHandler: GetBalanceHandler,
    private readonly statementHandler: GetStatementHandler,
  ) {}

  @Post('credit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Credit points to an account' })
  @ApiResponse({ status: 201, description: 'Points credited successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async credit(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreditPointsDto,
  ) {
    try {
      const command = new CreditPointsCommand(
        tenantId,
        dto.ownerType,
        dto.ownerId,
        dto.amount,
        dto.reasonCode,
        dto.referenceType,
        dto.referenceId,
        dto.metadata,
        requestId,
        actorId,
        idempotencyKey,
      );

      return await this.creditHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debit points from an account' })
  @ApiResponse({ status: 200, description: 'Points debited successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 402, description: 'Insufficient funds' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async debit(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: DebitPointsDto,
  ) {
    try {
      const command = new DebitPointsCommand(
        tenantId,
        dto.ownerType,
        dto.ownerId,
        dto.amount,
        dto.reasonCode,
        dto.referenceType,
        dto.referenceId,
        dto.metadata,
        requestId,
        actorId,
        idempotencyKey,
      );

      return await this.debitHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('hold')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Hold (reserve) points on an account' })
  @ApiResponse({ status: 201, description: 'Points held successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 402, description: 'Insufficient funds' })
  @ApiResponse({ status: 409, description: 'Hold already exists or idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async hold(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: HoldPointsDto,
  ) {
    try {
      const command = new HoldPointsCommand(
        tenantId,
        dto.ownerType,
        dto.ownerId,
        dto.amount,
        dto.reasonCode,
        dto.referenceType,
        dto.referenceId,
        dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        dto.metadata,
        requestId,
        actorId,
        idempotencyKey,
      );

      return await this.holdHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('holds/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a hold on points' })
  @ApiResponse({ status: 200, description: 'Hold released successfully' })
  @ApiResponse({ status: 404, description: 'Hold not found' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async release(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: ReleaseHoldDto,
  ) {
    try {
      const command = new ReleaseHoldCommand(
        tenantId,
        dto.ownerType,
        dto.ownerId,
        dto.referenceType,
        dto.referenceId,
        dto.reasonCode,
        dto.metadata,
        requestId,
        actorId,
        idempotencyKey,
      );

      return await this.releaseHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('holds/commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit a hold (finalize the deduction)' })
  @ApiResponse({ status: 200, description: 'Hold committed successfully' })
  @ApiResponse({ status: 404, description: 'Hold not found' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'X-Actor-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async commit(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CommitHoldDto,
  ) {
    try {
      const command = new CommitHoldCommand(
        tenantId,
        dto.ownerType,
        dto.ownerId,
        dto.referenceType,
        dto.referenceId,
        dto.reasonCode,
        dto.metadata,
        requestId,
        actorId,
        idempotencyKey,
      );

      return await this.commitHandler.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get balance for an account' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getBalance(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: GetBalanceQueryDto,
  ) {
    const query = new GetBalanceQuery(
      tenantId,
      dto.ownerType,
      dto.ownerId,
    );

    return await this.balanceHandler.execute(query);
  }

  @Get('statement')
  @ApiOperation({ summary: 'Get statement (ledger entries) for an account' })
  @ApiResponse({ status: 200, description: 'Statement retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getStatement(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: GetStatementQueryDto,
  ) {
    const query = new GetStatementQuery(
      tenantId,
      dto.ownerType,
      dto.ownerId,
      dto.page ?? 0,
      dto.size ?? 20,
      dto.from ? new Date(dto.from) : undefined,
      dto.to ? new Date(dto.to) : undefined,
      dto.entryType as LedgerEntryType | undefined,
      dto.referenceType,
      dto.referenceId,
    );

    return await this.statementHandler.execute(query);
  }

  private handleError(error: unknown): never {
    if (error instanceof ValidationError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof InsufficientFundsError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (error instanceof HoldNotFoundError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      error instanceof HoldAlreadyExistsError ||
      error instanceof HoldNotActiveError ||
      error instanceof IdempotencyConflictError
    ) {
      throw new HttpException(
        {
          error: (error as { code: string }).code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.CONFLICT,
      );
    }

    // Re-throw unknown errors
    throw error;
  }
}
