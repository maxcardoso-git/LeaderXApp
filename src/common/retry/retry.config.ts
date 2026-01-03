export interface RetryConfig {
  /** Maximum number of attempts (including first try) */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
};

/**
 * Retry configuration presets for common scenarios
 */
export const RETRY_PRESETS = {
  /** Quick retries for fast operations */
  FAST: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
  } as RetryConfig,

  /** Standard retries for typical API calls */
  STANDARD: {
    maxAttempts: 4,
    initialDelayMs: 250,
    maxDelayMs: 4000,
    backoffMultiplier: 2,
  } as RetryConfig,

  /** Aggressive retries for critical operations */
  AGGRESSIVE: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  } as RetryConfig,
};
