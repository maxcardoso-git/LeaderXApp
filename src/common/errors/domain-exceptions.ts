import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorDetail } from './error-response.interface';

/**
 * Base class for domain-specific exceptions
 */
export class DomainException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: ErrorDetail[],
  ) {
    super({ errorCode, message, details }, status);
  }
}

/**
 * Thrown when an idempotency key conflict is detected (request in progress)
 */
export class IdempotencyConflictException extends DomainException {
  constructor(idempotencyKey: string) {
    super(
      'IDEMPOTENCY_CONFLICT',
      `Request with Idempotency-Key "${idempotencyKey}" is still being processed`,
      HttpStatus.CONFLICT,
      [{ field: 'Idempotency-Key', issue: 'IN_PROGRESS' }],
    );
  }
}

/**
 * Thrown when an idempotency key has mismatched request body
 */
export class IdempotencyMismatchException extends DomainException {
  constructor(idempotencyKey: string) {
    super(
      'IDEMPOTENCY_MISMATCH',
      `Request body does not match previous request with Idempotency-Key "${idempotencyKey}"`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: 'Idempotency-Key', issue: 'REQUEST_MISMATCH' }],
    );
  }
}

/**
 * Thrown when an approval is not found
 */
export class ApprovalNotFoundException extends DomainException {
  constructor(approvalId: string) {
    super(
      'APPROVAL_NOT_FOUND',
      `Approval "${approvalId}" not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Thrown when an invalid approval decision is attempted
 */
export class InvalidApprovalDecisionException extends DomainException {
  constructor(reason: string) {
    super(
      'INVALID_APPROVAL_DECISION',
      reason,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Thrown when required context headers are missing
 */
export class MissingContextException extends DomainException {
  constructor(missingHeaders: string[]) {
    super(
      'MISSING_CONTEXT',
      `Missing required headers: ${missingHeaders.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      missingHeaders.map((h) => ({ field: h, issue: 'REQUIRED' })),
    );
  }
}

/**
 * Thrown when the Idempotency-Key header is missing on a mutating request
 */
export class MissingIdempotencyKeyException extends DomainException {
  constructor() {
    super(
      'MISSING_IDEMPOTENCY_KEY',
      'Idempotency-Key header is required for this operation',
      HttpStatus.BAD_REQUEST,
      [{ field: 'Idempotency-Key', issue: 'REQUIRED' }],
    );
  }
}

/**
 * Thrown when an upstream service call fails
 */
export class UpstreamServiceException extends DomainException {
  constructor(service: string, originalError?: string) {
    super(
      'UPSTREAM_SERVICE_ERROR',
      `Error communicating with ${service}: ${originalError || 'Unknown error'}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
