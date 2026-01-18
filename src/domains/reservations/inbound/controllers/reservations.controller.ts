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
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateReservationUseCase,
  CreateReservationCommand,
  ConfirmReservationUseCase,
  ConfirmReservationCommand,
  ReleaseReservationUseCase,
  ReleaseReservationCommand,
  GetReservationUseCase,
  GetReservationQuery,
  ListReservationsUseCase,
  ListReservationsQuery,
  PolicyNotFoundError,
  PolicyInactiveError,
  OutsideReservationWindowError,
  ResourceNotFoundError,
  InsufficientCapacityError,
  MaxPerUserExceededError,
  ReservationNotFoundError,
  ReservationStatusInvalidError,
  ReservationExpiredError,
} from '../../application/usecases';
import {
  CreateReservationDto,
  ReleaseReservationDto,
  ListReservationsQueryDto,
} from '../dtos';
import { IdempotencyConflictError } from '../../../points/outbound/repositories/idempotency.repository';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly createUseCase: CreateReservationUseCase,
    private readonly confirmUseCase: ConfirmReservationUseCase,
    private readonly releaseUseCase: ReleaseReservationUseCase,
    private readonly getUseCase: GetReservationUseCase,
    private readonly listUseCase: ListReservationsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a reservation (HOLD)' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 402, description: 'Insufficient capacity or points' })
  @ApiResponse({ status: 404, description: 'Resource or policy not found' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateReservationDto,
  ) {
    try {
      const command = new CreateReservationCommand(
        tenantId,
        dto.eventId,
        dto.resourceId,
        dto.resourceType,
        dto.ownerId,
        dto.ownerType,
        dto.policyId,
        dto.metadata,
        requestId,
        undefined, // actorId
        idempotencyKey,
      );

      return await this.createUseCase.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 409, description: 'Invalid status or idempotency conflict' })
  @ApiResponse({ status: 410, description: 'Reservation expired' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  async confirm(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Param('id') reservationId: string,
  ) {
    try {
      const command = new ConfirmReservationCommand(
        tenantId,
        reservationId,
        requestId,
        undefined, // actorId
        idempotencyKey,
      );

      return await this.confirmUseCase.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation released successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 409, description: 'Invalid status or idempotency conflict' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  async release(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Param('id') reservationId: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    try {
      const command = new ReleaseReservationCommand(
        tenantId,
        reservationId,
        dto.reason,
        requestId,
        undefined, // actorId
        idempotencyKey,
      );

      return await this.releaseUseCase.execute(command);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiResponse({ status: 200, description: 'Reservation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  async get(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') reservationId: string,
  ) {
    try {
      const query = new GetReservationQuery(tenantId, reservationId);
      return await this.getUseCase.execute(query);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  @ApiResponse({ status: 200, description: 'Reservations retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ListReservationsQueryDto,
  ) {
    const query = new ListReservationsQuery(
      tenantId,
      dto.eventId,
      dto.ownerId,
      dto.status,
      dto.page ?? 0,
      dto.size ?? 25,
    );

    return await this.listUseCase.execute(query);
  }

  private handleError(error: unknown): never {
    // Policy errors
    if (error instanceof PolicyNotFoundError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof PolicyInactiveError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof OutsideReservationWindowError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Resource errors
    if (error instanceof ResourceNotFoundError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Capacity errors
    if (error instanceof InsufficientCapacityError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.PAYMENT_REQUIRED, // 402
      );
    }

    if (error instanceof MaxPerUserExceededError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Reservation errors
    if (error instanceof ReservationNotFoundError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof ReservationStatusInvalidError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.CONFLICT,
      );
    }

    if (error instanceof ReservationExpiredError) {
      throw new HttpException(
        {
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.GONE, // 410
      );
    }

    // Idempotency errors
    if (error instanceof IdempotencyConflictError) {
      throw new HttpException(
        {
          error: error.code,
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
