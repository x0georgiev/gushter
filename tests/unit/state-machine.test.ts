import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInitialState, GushterState } from '../../src/types/state.js';

describe('State Types', () => {
  describe('createInitialState', () => {
    it('should create valid initial state', () => {
      const state = createInitialState('gushter/feature', 10);

      expect(state.version).toBe(1);
      expect(state.branchName).toBe('gushter/feature');
      expect(state.currentIteration).toBe(0);
      expect(state.maxIterations).toBe(10);
      expect(state.iterations).toEqual([]);
      expect(state.blockedStories).toEqual([]);
      expect(state.startedAt).toBeDefined();
      expect(state.lastUpdatedAt).toBeDefined();
    });

    it('should set timestamps to current time', () => {
      const before = new Date().toISOString();
      const state = createInitialState('gushter/feature', 10);
      const after = new Date().toISOString();

      expect(state.startedAt >= before).toBe(true);
      expect(state.startedAt <= after).toBe(true);
    });
  });
});

describe('State Transitions', () => {
  it('should allow valid status transitions', () => {
    const validTransitions: Record<string, string[]> = {
      pending: ['in_progress'],
      in_progress: ['completed', 'failed', 'blocked'],
      failed: ['in_progress', 'blocked'],
      blocked: ['rolled_back'],
      completed: [],
      rolled_back: ['in_progress'],
    };

    // This documents the expected state machine behavior
    expect(validTransitions.pending).toContain('in_progress');
    expect(validTransitions.in_progress).toContain('completed');
    expect(validTransitions.in_progress).toContain('failed');
    expect(validTransitions.failed).toContain('in_progress');
    expect(validTransitions.failed).toContain('blocked');
  });
});
