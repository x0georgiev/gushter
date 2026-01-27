import { describe, it, expect } from 'vitest';
import { GushterConfigSchema, DEFAULT_CONFIG } from '../../src/config/schema.js';

describe('GushterConfigSchema', () => {
  it('should validate default config', () => {
    const result = GushterConfigSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxIterations).toBe(10);
      expect(result.data.maxRetriesPerStory).toBe(3);
    }
  });

  it('should validate retry config', () => {
    const result = GushterConfigSchema.safeParse({
      retry: {
        initialDelayMs: 5000,
        backoffMultiplier: 3,
        maxDelayMs: 120000,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retry.initialDelayMs).toBe(5000);
      expect(result.data.retry.backoffMultiplier).toBe(3);
      expect(result.data.retry.maxDelayMs).toBe(120000);
    }
  });

  it('should validate verification commands', () => {
    const result = GushterConfigSchema.safeParse({
      verification: {
        commands: [
          { name: 'typecheck', command: 'npm run typecheck' },
          { name: 'lint', command: 'npm run lint', optional: true },
        ],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verification.commands).toHaveLength(2);
      expect(result.data.verification.commands[0]?.name).toBe('typecheck');
      expect(result.data.verification.commands[1]?.optional).toBe(true);
    }
  });

  it('should accept custom paths', () => {
    const result = GushterConfigSchema.safeParse({
      prdPath: 'custom/prd.json',
      progressPath: 'custom/progress.txt',
      claudeMdPath: 'custom/CLAUDE.md',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prdPath).toBe('custom/prd.json');
      expect(result.data.progressPath).toBe('custom/progress.txt');
      expect(result.data.claudeMdPath).toBe('custom/CLAUDE.md');
    }
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CONFIG.maxIterations).toBe(10);
    expect(DEFAULT_CONFIG.maxRetriesPerStory).toBe(3);
    expect(DEFAULT_CONFIG.retry.initialDelayMs).toBe(2000);
    expect(DEFAULT_CONFIG.retry.backoffMultiplier).toBe(2);
    expect(DEFAULT_CONFIG.prdPath).toBe('prd.json');
    expect(DEFAULT_CONFIG.progressPath).toBe('progress.txt');
    expect(DEFAULT_CONFIG.claudeMdPath).toBe('CLAUDE.md');
  });
});
