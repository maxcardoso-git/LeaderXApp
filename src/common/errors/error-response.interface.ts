import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetail {
  @ApiProperty()
  field: string;

  @ApiProperty()
  issue: string;

  @ApiPropertyOptional()
  value?: unknown;
}

export class ErrorResponse {
  @ApiProperty({ description: 'Error code' })
  error: string;

  @ApiProperty({ description: 'Human-readable error message' })
  message: string;

  @ApiProperty({ description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Request path' })
  path?: string;

  @ApiPropertyOptional({ description: 'HTTP method' })
  method?: string;

  @ApiPropertyOptional({ type: [ErrorDetail], description: 'Detailed errors' })
  details?: ErrorDetail[];
}
