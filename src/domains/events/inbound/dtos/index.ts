import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  EventStatus,
  EventVisibility,
  ReservationMode,
  PolicyScope,
} from '../../domain';

// ================== Admin DTOs ==================

// Event DTOs
export class CreateEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventVisibility, default: EventVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({ enum: ReservationMode, default: ReservationMode.FREE })
  @IsOptional()
  @IsEnum(ReservationMode)
  reservationMode?: ReservationMode;

  @ApiProperty({ description: 'Event start date/time' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'Event end date/time' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Event name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventVisibility })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({ enum: ReservationMode })
  @IsOptional()
  @IsEnum(ReservationMode)
  reservationMode?: ReservationMode;

  @ApiPropertyOptional({ description: 'Event start date/time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Event end date/time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CancelEventDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Phase DTOs
export class AddEventPhaseDto {
  @ApiProperty({ description: 'Phase name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Phase start date/time' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'Phase end date/time' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateEventPhaseDto {
  @ApiPropertyOptional({ description: 'Phase name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phase start date/time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Phase end date/time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Table DTOs
export class AddEventTableDto {
  @ApiProperty({ description: 'Table name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Table capacity' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateEventTableDto {
  @ApiPropertyOptional({ description: 'Table name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Table capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Seat DTOs
export class AddEventSeatDto {
  @ApiProperty({ description: 'Seat number' })
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Policy Binding DTOs
export class BindPolicyDto {
  @ApiProperty({ description: 'Policy code' })
  @IsString()
  policyCode: string;

  @ApiPropertyOptional({ enum: PolicyScope, default: PolicyScope.EVENT })
  @IsOptional()
  @IsEnum(PolicyScope)
  scope?: PolicyScope;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UnbindPolicyDto {
  @ApiProperty({ description: 'Policy code' })
  @IsString()
  policyCode: string;
}

// ================== Query DTOs ==================

export class ListEventsQueryDto {
  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventVisibility })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsBefore?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 25;
}

export class ListPublicEventsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAfter?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 25;
}

// ================== Response DTOs ==================

export class EventResponseDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: string;
  visibility: string;
  reservationMode: string;
  startsAt: string;
  endsAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class EventDetailResponseDto extends EventResponseDto {
  phases: EventPhaseResponseDto[];
  tables: EventTableResponseDto[];
  policyBindings: EventPolicyBindingResponseDto[];
}

export class EventPhaseResponseDto {
  id: string;
  eventId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EventTableResponseDto {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  seatsCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EventTableDetailResponseDto extends EventTableResponseDto {
  seats: EventSeatResponseDto[];
}

export class EventSeatResponseDto {
  id: string;
  tableId: string;
  seatNumber: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EventPolicyBindingResponseDto {
  id: string;
  eventId: string;
  policyCode: string;
  scope: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EventAvailabilityResponseDto {
  eventId: string;
  totalTables: number;
  availableTables: number;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
}

export class TableAvailabilityResponseDto {
  tableId: string;
  tableName: string;
  capacity: number;
  seatsCount: number;
  reservedSeats: number;
  availableSeats: number;
  isAvailable: boolean;
}

export class SeatAvailabilityResponseDto {
  seatId: string;
  seatNumber: number;
  tableId: string;
  isReserved: boolean;
  isHeld: boolean;
  isAvailable: boolean;
}

export class PaginatedResponseDto<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
