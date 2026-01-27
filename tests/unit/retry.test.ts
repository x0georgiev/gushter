import { describe, it, expect, vi } from 'vitest';
import {
  calculateBackoffDelay,
  RetryTracker,
  withRetry,
} from '../../src/utils/retry.js';

describe('calculateBackoffDelay', () => {
  const defaultConfig = {
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
  };

  it('should return initial delay for first attempt', () => {
    const delay = calculateBackoffDelay(1, defaultConfig);
    expect(delay).toBe(1000);
  });

  it('should apply exponential backoff', () => {
    expect(calculateBackoffDelay(1, defaultConfig)).toBe(1000);
    expect(calculateBackoffDelay(2, defaultConfig)).toBe(2000);
    expect(calculateBackoffDelay(3, defaultConfig)).toBe(4000);
    expect(calculateBackoffDelay(4, defaultConfig)).toBe(8000);
  });

  it('should cap at max delay', () => {
    const delay = calculateBackoffDelay(10, defaultConfig);
    expect(delay).toBe(30000);
  });

  it('should use custom config values', () => {
    const config = {
      initialDelayMs: 500,
      backoffMultiplier: 3,
      maxDelayMs: 10000,
    };

    expect(calculateBackoffDelay(1, config)).toBe(500);
    expect(calculateBackoffDelay(2, config)).toBe(1500);
    expect(calculateBackoffDelay(3, config)).toBe(4500);
    expect(calculateBackoffDelay(4, config)).toBe(10000); // capped
  });
});

describe('RetryTracker', () => {
  it('should track retry counts per key', () => {
    const tracker = new RetryTracker(3);

    expect(tracker.getRetryCount('story-1')).toBe(0);

    tracker.incrementRetry('story-1');
    expect(tracker.getRetryCount('story-1')).toBe(1);

    tracker.incrementRetry('story-1');
    expect(tracker.getRetryCount('story-1')).toBe(2);
  });

  it('should check if retry is allowed', () => {
    const tracker = new RetryTracker(2);

    expect(tracker.canRetry('story-1')).toBe(true);

    tracker.incrementRetry('story-1');
    expect(tracker.canRetry('story-1')).toBe(true);

    tracker.incrementRetry('story-1');
    expect(tracker.canRetry('story-1')).toBe(false);
  });

  it('should reset individual keys', () => {
    const tracker = new RetryTracker(3);

    tracker.incrementRetry('story-1');
    tracker.incrementRetry('story-1');
    tracker.reset('story-1');

    expect(tracker.getRetryCount('story-1')).toBe(0);
  });

  it('should reset all keys', () => {
    const tracker = new RetryTracker(3);

    tracker.incrementRetry('story-1');
    tracker.incrementRetry('story-2');
    tracker.resetAll();

    expect(tracker.getRetryCount('story-1')).toBe(0);
    expect(tracker.getRetryCount('story-2')).toBe(0);
  });
});

describe('withRetry', () => {
  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      maxDelayMs: 100,
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      maxDelayMs: 100,
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      maxDelayMs: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('always fails');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
