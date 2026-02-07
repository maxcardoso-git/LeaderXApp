import { IsString, IsNotEmpty, IsOptional, Allow } from 'class-validator';

export class SimulatePointsDto {
  @IsString() @IsNotEmpty() eventCode: string;
  @Allow() payload: Record<string, any>;
  @Allow() @IsOptional() context?: Record<string, any>;
}
