import { Controller, Post, Put, Get, Delete, Body, Param, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  CreateEventDto, UpdateEventDto, CancelEventDto,
  AddEventPhaseDto, UpdateEventPhaseDto,
  AddEventTableDto, UpdateEventTableDto,
  AddEventSeatDto, BindPolicyDto,
  ListEventsQueryDto, EventResponseDto, EventDetailResponseDto,
  EventPhaseResponseDto, EventTableResponseDto, EventSeatResponseDto,
  EventPolicyBindingResponseDto, PaginatedResponseDto,
} from '../dtos';
import {
  CreateEventUseCase, UpdateEventUseCase,
  PublishEventUseCase, ActivateEventUseCase, CloseEventUseCase, CancelEventUseCase,
  AddEventPhaseUseCase, UpdateEventPhaseUseCase, RemoveEventPhaseUseCase,
  AddEventTableUseCase, UpdateEventTableUseCase, RemoveEventTableUseCase,
  AddEventSeatUseCase, RemoveEventSeatUseCase,
  BindPolicyUseCase, UnbindPolicyUseCase,
} from '../../application/usecases/admin';
import { EventAggregate } from '../../domain/aggregates';

@ApiTags('Admin Events')
@Controller('admin/events')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Actor-Id', required: false })
@ApiHeader({ name: 'Idempotency-Key', required: false })
export class AdminEventsController {
  constructor(
    private readonly createEvent: CreateEventUseCase,
    private readonly updateEvent: UpdateEventUseCase,
    private readonly publishEvent: PublishEventUseCase,
    private readonly activateEvent: ActivateEventUseCase,
    private readonly closeEvent: CloseEventUseCase,
    private readonly cancelEvent: CancelEventUseCase,
    private readonly addPhase: AddEventPhaseUseCase,
    private readonly updatePhase: UpdateEventPhaseUseCase,
    private readonly removePhase: RemoveEventPhaseUseCase,
    private readonly addTable: AddEventTableUseCase,
    private readonly updateTable: UpdateEventTableUseCase,
    private readonly removeTable: RemoveEventTableUseCase,
    private readonly addSeat: AddEventSeatUseCase,
    private readonly removeSeat: RemoveEventSeatUseCase,
    private readonly bindPolicy: BindPolicyUseCase,
    private readonly unbindPolicy: UnbindPolicyUseCase,
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

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const { event } = await this.createEvent.execute({
      tenantId,
      name: dto.name,
      description: dto.description,
      visibility: dto.visibility,
      reservationMode: dto.reservationMode,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      metadata: dto.metadata,
      actorId,
      idempotencyKey,
    });
    return this.toEventResponse(event);
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Update an event' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const { event } = await this.updateEvent.execute({
      tenantId,
      eventId,
      name: dto.name,
      description: dto.description,
      visibility: dto.visibility,
      reservationMode: dto.reservationMode,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      metadata: dto.metadata,
      actorId,
    });
    return this.toEventResponse(event);
  }

  @Post(':eventId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an event' })
  async publish(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventResponseDto> {
    const { event } = await this.publishEvent.execute({ tenantId, eventId, actorId });
    return this.toEventResponse(event);
  }

  @Post(':eventId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an event' })
  async activate(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventResponseDto> {
    const { event } = await this.activateEvent.execute({ tenantId, eventId, actorId });
    return this.toEventResponse(event);
  }

  @Post(':eventId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an event' })
  async close(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventResponseDto> {
    const { event } = await this.closeEvent.execute({ tenantId, eventId, actorId });
    return this.toEventResponse(event);
  }

  @Post(':eventId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an event' })
  async cancel(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CancelEventDto,
  ): Promise<EventResponseDto> {
    const { event } = await this.cancelEvent.execute({ tenantId, eventId, reason: dto.reason, actorId });
    return this.toEventResponse(event);
  }

  // Phases
  @Post(':eventId/phases')
  @ApiOperation({ summary: 'Add a phase to an event' })
  async createPhase(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() dto: AddEventPhaseDto,
  ): Promise<EventPhaseResponseDto> {
    const { phase } = await this.addPhase.execute({
      tenantId, eventId, name: dto.name,
      startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt),
      sortOrder: dto.sortOrder, metadata: dto.metadata, actorId,
    });
    return { id: phase.id, eventId, name: phase.name, startsAt: phase.startsAt.toISOString(), endsAt: phase.endsAt.toISOString(), sortOrder: phase.sortOrder, metadata: phase.metadata, createdAt: phase.createdAt.toISOString() };
  }

  @Put(':eventId/phases/:phaseId')
  @ApiOperation({ summary: 'Update a phase' })
  async editPhase(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateEventPhaseDto,
  ): Promise<{ success: boolean }> {
    await this.updatePhase.execute({
      tenantId, eventId, phaseId, name: dto.name,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      sortOrder: dto.sortOrder, metadata: dto.metadata,
    });
    return { success: true };
  }

  @Delete(':eventId/phases/:phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a phase' })
  async deletePhase(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('phaseId') phaseId: string,
  ): Promise<void> {
    await this.removePhase.execute({ tenantId, eventId, phaseId });
  }

  // Tables
  @Post(':eventId/tables')
  @ApiOperation({ summary: 'Add a table to an event' })
  async createTable(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() dto: AddEventTableDto,
  ): Promise<EventTableResponseDto> {
    const { table } = await this.addTable.execute({
      tenantId, eventId, name: dto.name, capacity: dto.capacity, metadata: dto.metadata, actorId,
    });
    return { id: table.id, eventId, name: table.name, capacity: table.capacity, seatsCount: table.seats.length, metadata: table.metadata, createdAt: table.createdAt.toISOString() };
  }

  @Put(':eventId/tables/:tableId')
  @ApiOperation({ summary: 'Update a table' })
  async editTable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateEventTableDto,
  ): Promise<{ success: boolean }> {
    await this.updateTable.execute({ tenantId, eventId, tableId, name: dto.name, capacity: dto.capacity, metadata: dto.metadata });
    return { success: true };
  }

  @Delete(':eventId/tables/:tableId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a table' })
  async deleteTable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('tableId') tableId: string,
  ): Promise<void> {
    await this.removeTable.execute({ tenantId, eventId, tableId });
  }

  // Seats
  @Post(':eventId/tables/:tableId/seats')
  @ApiOperation({ summary: 'Add a seat to a table' })
  async createSeat(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Param('tableId') tableId: string,
    @Body() dto: AddEventSeatDto,
  ): Promise<EventSeatResponseDto> {
    const { seat } = await this.addSeat.execute({
      tenantId, eventId, tableId, seatNumber: dto.seatNumber, metadata: dto.metadata, actorId,
    });
    return { id: seat.id, tableId, seatNumber: seat.seatNumber, metadata: seat.metadata, createdAt: seat.createdAt.toISOString() };
  }

  @Delete(':eventId/tables/:tableId/seats/:seatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a seat' })
  async deleteSeat(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Param('tableId') tableId: string,
    @Param('seatId') seatId: string,
  ): Promise<void> {
    await this.removeSeat.execute({ tenantId, eventId, tableId, seatId });
  }

  // Policies
  @Post(':eventId/policies')
  @ApiOperation({ summary: 'Bind a policy to an event' })
  async createPolicyBinding(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() dto: BindPolicyDto,
  ): Promise<EventPolicyBindingResponseDto> {
    const { binding } = await this.bindPolicy.execute({
      tenantId, eventId, policyCode: dto.policyCode, scope: dto.scope, metadata: dto.metadata, actorId,
    });
    return { id: binding.id, eventId, policyCode: binding.policyCode, scope: binding.scope, metadata: binding.metadata, createdAt: binding.createdAt.toISOString() };
  }

  @Delete(':eventId/policies/:policyCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unbind a policy from an event' })
  async deletePolicyBinding(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Param('policyCode') policyCode: string,
  ): Promise<void> {
    await this.unbindPolicy.execute({ tenantId, eventId, policyCode, actorId });
  }
}
