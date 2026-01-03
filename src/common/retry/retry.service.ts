import { Injectable, Logger } from '@nestjs/common';
import { RetryConfig, DEFAULT_RETRY_CONFIG } from './retry.config';

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error?: Error;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute an operation with automatic retries
   */
  async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName: string = 'unknown',
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let delay = fullConfig.initialDelayMs;

    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we've exhausted all attempts
        if (attempt === fullConfig.maxAttempts) {
          this.logger.error(
            `Operation "${operationName}" failed after ${attempt} attempts: ${lastError.message}`,
            lastError.stack,
          );
          throw lastError;
        }

        // Check if error is retryable
        if (!this.isRetryable(lastError, fullConfig)) {
          this.logger.warn(
            `Operation "${operationName}" failed with non-retryable error: ${lastError.message}`,
          );
          throw lastError;
        }

        this.logger.warn(
          `Operation "${operationName}" failed (attempt ${attempt}/${fullConfig.maxAttempts}), retrying in ${delay}ms: ${lastError.message}`,
        );

        await this.sleep(delay);
        delay = Math.min(
          delay * fullConfig.backoffMultiplier,
          fullConfig.maxDelayMs,
        );
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Execute with a callback for each retry attempt
   */
  async executeWithCallback<T>(
    operation: (context: RetryContext) => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (context: RetryContext) => void,
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let delay = fullConfig.initialDelayMs;

    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
      const context: RetryContext = {
        attempt,
        maxAttempts: fullConfig.maxAttempts,
        delay,
        error: lastError,
      };

      try {
        return await operation(context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        context.error = lastError;

        if (attempt === fullConfig.maxAttempts) {
          throw lastError;
        }

        if (!this.isRetryable(lastError, fullConfig)) {
          throw lastError;
        }

        if (onRetry) {
          onRetry(context);
        }

        await this.sleep(delay);
        delay = Math.min(
          delay * fullConfig.backoffMultiplier,
          fullConfig.maxDelayMs,
        );
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryable(error: Error, config: RetryConfig): boolean {
    const statusCodes = config.retryableStatusCodes || [];

    // Extract HTTP status from various error shapes
    const status = this.extractHttpStatus(error);
    if (status && statusCodes.includes(status)) {
      return true;
    }

    // Check for network/timeout errors by message
    const message = error.message?.toLowerCase() || '';
    const retryablePatterns = [
      'econnrefused',
      'etimedout',
      'econnreset',
      'socket hang up',
      'network',
      'timeout',
      'dns',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Extract HTTP status code from various error shapes
   */
  private extractHttpStatus(error: Error): number | null {
    const e = error as Record<string, unknown>;

    // Try common error shapes
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;

    // Axios error shape
    if (e.response && typeof e.response === 'object') {
      const response = e.response as Record<string, unknown>;
      if (typeof response.status === 'number') return response.status;
      if (typeof response.statusCode === 'number') return response.statusCode;
    }

    // NestJS HttpException shape
    if (typeof e.getStatus === 'function') {
      try {
        return (e.getStatus as () => number)();
      } catch {
        // ignore
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
