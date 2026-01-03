import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IdempotencyRepository } from './idempotency.repository';
import {
  IdempotencyRunInput,
  IdempotencyResult,
  IdempotencyStatus,
} from './idempotency.interface';
import {
  IdempotencyConflictException,
  IdempotencyMismatchException,
} from '../errors/domain-exceptions';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly repository: IdempotencyRepository) {}

  /**
   * Check for existing idempotency record or create a new one
   *
   * @returns IdempotencyResult with isNew flag and record
   * @throws IdempotencyConflictException if request is still in progress
   * @throws IdempotencyMismatchException if request hash doesn't match
   */
  async checkOrCreate<T>(
    input: IdempotencyRunInput,
    requestBody: unknown,
  ): Promise<IdempotencyResult<T>> {
    const requestHash = this.hashRequest(requestBody);

    // Check for existing record
    const existing = await this.repository.findByKey(
      input.scope,
      input.key,
      input.tenantId,
    );

    if (existing) {
      // Validate request hash matches
      if (existing.requestHash !== requestHash) {
        this.logger.warn(
          `Idempotency key "${input.key}" has mismatched request hash`,
        );
        throw new IdempotencyMismatchException(input.key);
      }

      switch (existing.status) {
        case IdempotencyStatus.IN_PROGRESS:
          // Request is still being processed
          this.logger.debug(
            `Idempotency key "${input.key}" is still IN_PROGRESS`,
          );
          throw new IdempotencyConflictException(input.key);

        case IdempotencyStatus.COMPLETED:
          // Return cached response
          this.logger.debug(
            `Returning cached response for idempotency key "${input.key}"`,
          );
          return {
            isNew: false,
            record: existing,
            cachedResponse: existing.responsePayload as T,
            cachedStatus: existing.httpStatus,
          };

        case IdempotencyStatus.FAILED:
          // Allow retry - delete old record
          this.logger.debug(
            `Allowing retry for failed idempotency key "${input.key}"`,
          );
          await this.repository.deleteById(existing.id);
          break;
      }
    }

    // Create new idempotency record
    const record = await this.repository.create(
      input.scope,
      input.key,
      input.tenantId,
      requestHash,
      input.ttlHours,
    );

    this.logger.debug(`Created idempotency record for key "${input.key}"`);

    return {
      isNew: true,
      record,
    };
  }

  /**
   * Mark an idempotency record as completed with the response
   */
  async complete<T>(recordId: string, response: T, httpStatus: number = 200): Promise<void> {
    await this.repository.markCompleted(recordId, httpStatus, response);
    this.logger.debug(`Marked idempotency record ${recordId} as COMPLETED`);
  }

  /**
   * Mark an idempotency record as failed
   */
  async fail(recordId: string, error: unknown, httpStatus: number = 500): Promise<void> {
    const errorPayload =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { message: String(error) };

    await this.repository.markFailed(recordId, httpStatus, errorPayload);
    this.logger.debug(`Marked idempotency record ${recordId} as FAILED`);
  }

  /**
   * Execute an operation with idempotency protection
   *
   * This is a convenience wrapper that handles the full idempotency flow:
   * 1. Check/create idempotency record
   * 2. Execute operation if new
   * 3. Mark as completed or failed
   * 4. Return response (cached or new)
   */
  async run<T>(
    input: IdempotencyRunInput,
    requestBody: unknown,
    operation: () => Promise<T>,
    httpStatusOnSuccess: number = 200,
  ): Promise<{ response: T; httpStatus: number; isNew: boolean }> {
    const result = await this.checkOrCreate<T>(input, requestBody);

    if (!result.isNew) {
      return {
        response: result.cachedResponse!,
        httpStatus: result.cachedStatus!,
        isNew: false,
      };
    }

    try {
      const response = await operation();
      await this.complete(result.record.id, response, httpStatusOnSuccess);
      return {
        response,
        httpStatus: httpStatusOnSuccess,
        isNew: true,
      };
    } catch (error) {
      const status = this.extractHttpStatus(error) || 500;
      await this.fail(result.record.id, error, status);
      throw error;
    }
  }

  /**
   * Create a stable hash of the request body
   */
  private hashRequest(body: unknown): string {
    const normalized = JSON.stringify(body, Object.keys(body as object).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Extract HTTP status from error
   */
  private extractHttpStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;

    const e = error as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;

    if (typeof e.getStatus === 'function') {
      try {
        return (e.getStatus as () => number)();
      } catch {
        // ignore
      }
    }

    return null;
  }
}
