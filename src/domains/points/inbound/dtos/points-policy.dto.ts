import { IsString, IsOptional, IsNotEmpty, Allow } from 'class-validator';

export class CreatePointsPolicyDto {
  @IsString() @IsNotEmpty() name: string;
  @Allow() rules: Record<string, any>;
}

export class UpdatePointsPolicyDto {
  @IsString() @IsOptional() name?: string;
  @Allow() @IsOptional() rules?: Record<string, any>;
}
