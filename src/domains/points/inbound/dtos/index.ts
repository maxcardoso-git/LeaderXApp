import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OwnerType } from '../../domain';

// ============================================
// Request DTOs
// ============================================

export class CreditPointsDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  reasonCode: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class DebitPointsDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  reasonCode: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class HoldPointsDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  reasonCode: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReleaseHoldDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsString()
  reasonCode: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CommitHoldDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsString()
  reasonCode: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ============================================
// Query DTOs
// ============================================

export class GetBalanceQueryDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;
}

export class GetStatementQueryDto {
  @IsIn([OwnerType.USER, OwnerType.ORG])
  ownerType: OwnerType;

  @IsString()
  ownerId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number;
}

// ============================================
// Ledger Entry DTOs (journey-aware)
// ============================================

export class PostPointsEntryDto {
  @IsString()
  memberId: string;

  @IsIn(['CREDIT', 'DEBIT'])
  entryType: 'CREDIT' | 'DEBIT';

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  reasonCode: string;

  @IsString()
  referenceType: string;

  @IsString()
  referenceId: string;

  @IsString()
  journeyCode: string;

  @IsString()
  journeyTrigger: string;

  @IsOptional()
  @IsString()
  approvalPolicyCode?: string;

  @IsOptional()
  @IsString()
  approvalRequestId?: string;

  @IsOptional()
  @IsString()
  sourceEventId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReversePointsEntryDto {
  @IsString()
  reasonCode: string;
}

export class ListLedgerEntriesQueryDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  journeyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number;
}
