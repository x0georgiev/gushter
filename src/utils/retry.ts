import { RetryConfig } from '../config/schema.js';
import { logger } from './logger.js';

export interface RetryOptions extends RetryConfig {
  maxRetries: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const { initialDelayMs = 2000, backoffMultiplier = 2, maxDelayMs = 60000 } = config;
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const { maxRetries, initialDelayMs, backoffMultiplier, maxDelayMs } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, {
          initialDelayMs,
          backoffMultiplier,
          maxDelayMs,
        });
        logger.debug(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries,
  };
}

export class RetryTracker {
  private retries: Map<string, number> = new Map();
  private maxRetries: number;

  constructor(maxRetries: number) {
    this.maxRetries = maxRetries;
  }

  getRetryCount(key: string): number {
    return this.retries.get(key) ?? 0;
  }

  incrementRetry(key: string): number {
    const current = this.getRetryCount(key);
    const newCount = current + 1;
    this.retries.set(key, newCount);
    return newCount;
  }

  canRetry(key: string): boolean {
    return this.getRetryCount(key) < this.maxRetries;
  }

  reset(key: string): void {
    this.retries.delete(key);
  }

  resetAll(): void {
    this.retries.clear();
  }
}
