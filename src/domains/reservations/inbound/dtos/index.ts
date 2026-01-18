import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsIn,
  IsOptional,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceType, ReservationOwnerType, ReservationStatus } from '../../domain';

// ============================================
// CREATE RESERVATION
// ============================================

export class CreateReservationDto {
  @ApiProperty({ description: 'Event ID' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Resource ID' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ enum: ResourceType, description: 'Resource type' })
  @IsIn([ResourceType.TABLE, ResourceType.SEAT, ResourceType.SLOT])
  resourceType: ResourceType;

  @ApiProperty({ description: 'Owner ID' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ enum: ReservationOwnerType, description: 'Owner type' })
  @IsIn([
    ReservationOwnerType.MEMBER,
    ReservationOwnerType.LEADER,
    ReservationOwnerType.GUEST,
  ])
  ownerType: ReservationOwnerType;

  @ApiProperty({ description: 'Policy ID' })
  @IsUUID()
  policyId: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ============================================
// RELEASE RESERVATION
// ============================================

export class ReleaseReservationDto {
  @ApiProperty({ description: 'Reason for release' })
  @IsString()
  reason: string;
}

// ============================================
// LIST RESERVATIONS QUERY
// ============================================

export class ListReservationsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by event ID' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsIn([
    ReservationStatus.HOLD,
    ReservationStatus.CONFIRMED,
    ReservationStatus.RELEASED,
    ReservationStatus.EXPIRED,
    ReservationStatus.CANCELLED,
  ])
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Page number (0-indexed)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;
}
