import { Controller, Get, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  ListPublicEventsQueryDto,
  EventResponseDto, EventDetailResponseDto,
  TableAvailabilityResponseDto, SeatAvailabilityResponseDto,
  EventAvailabilityResponseDto, PaginatedResponseDto,
  EventPhaseResponseDto, EventTableResponseDto, EventPolicyBindingResponseDto,
} from '../dtos';
import {
  ListPublicEventsUseCase,
  GetEventDetailsUseCase,
  GetEventTablesUseCase,
  GetEventSeatsUseCase,
  CheckEventAvailabilityUseCase,
} from '../../application/usecases/public';
import { EventAggregate } from '../../domain/aggregates';

@ApiTags('Public Events')
@Controller('events')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class PublicEventsController {
  constructor(
    private readonly listPublicEvents: ListPublicEventsUseCase,
    private readonly getEventDetails: GetEventDetailsUseCase,
    private readonly getEventTables: GetEventTablesUseCase,
    private readonly getEventSeats: GetEventSeatsUseCase,
    private readonly checkEventAvailability: CheckEventAvailabilityUseCase,
  ) {}

  private toEventResponse(event: EventAggregate): EventResponseDto {
    return {
      id: event.id,
      tenantId: event.tenantId,
      name: event.name,
      description: event.description,
      status: event.status,
      visibility: event.visibility,
      reservationMode: event.reservationMode,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  private toDetailResponse(event: EventAggregate): EventDetailResponseDto {
    const phases: EventPhaseResponseDto[] = event.phases.map((p) => ({
      id: p.id,
      eventId: event.id,
      name: p.name,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      sortOrder: p.sortOrder,
      metadata: p.metadata,
      createdAt: p.createdAt.toISOString(),
    }));

    const tables: EventTableResponseDto[] = event.tables.map((t) => ({
      id: t.id,
      eventId: event.id,
      name: t.name,
      capacity: t.capacity,
      seatsCount: t.seats.length,
      metadata: t.metadata,
      createdAt: t.createdAt.toISOString(),
    }));

    const policyBindings: EventPolicyBindingResponseDto[] = event.policyBindings.map((b) => ({
      id: b.id,
      eventId: event.id,
      policyCode: b.policyCode,
      scope: b.scope,
      metadata: b.metadata,
      createdAt: b.createdAt.toISOString(),
    }));

    return {
      ...this.toEventResponse(event),
      phases,
      tables,
      policyBindings,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List public events' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListPublicEventsQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    const result = await this.listPublicEvents.execute({
      tenantId,
      pagination: { page: query.page ?? 1, size: query.size ?? 25 },
    });

    return {
      items: result.items.map((e) => this.toEventResponse(e)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get event details' })
  async getDetails(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventDetailResponseDto> {
    const event = await this.getEventDetails.execute({ tenantId, eventId });
    return this.toDetailResponse(event);
  }

  @Get(':eventId/tables')
  @ApiOperation({ summary: 'Get event tables with availability' })
  async getTables(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ): Promise<TableAvailabilityResponseDto[]> {
    const tables = await this.getEventTables.execute({ tenantId, eventId });
    return tables.map((t) => ({
      tableId: t.tableId,
      tableName: t.tableName,
      capacity: t.capacity,
      seatsCount: t.seatsCount,
      reservedSeats: t.reservedSeats,
      availableSeats: t.availableSeats,
      isAvailable: t.isAvailable,
    }));
  }

  @Get(':eventId/tables/:tableId/seats')
  @ApiOperation({ summary: 'Get table seats with availability' })
  async getSeats(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('tableId') tableId: string,
  ): Promise<SeatAvailabilityResponseDto[]> {
    const seats = await this.getEventSeats.execute({ tenantId, eventId, tableId });
    return seats.map((s) => ({
      seatId: s.seatId,
      seatNumber: s.seatNumber,
      tableId: s.tableId,
      isReserved: s.isReserved,
      isHeld: s.isHeld,
      isAvailable: s.isAvailable,
    }));
  }

  @Get(':eventId/availability')
  @ApiOperation({ summary: 'Check event availability' })
  async checkAvailability(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventAvailabilityResponseDto> {
    const availability = await this.checkEventAvailability.execute({ tenantId, eventId });
    return {
      eventId: availability.eventId,
      totalTables: availability.totalTables,
      availableTables: availability.availableTables,
      totalSeats: availability.totalSeats,
      availableSeats: availability.availableSeats,
      isAvailable: availability.isAvailable,
    };
  }
}
