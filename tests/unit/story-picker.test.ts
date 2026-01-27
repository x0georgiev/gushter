import { describe, it, expect } from 'vitest';
import { StoryPicker } from '../../src/core/story-picker.js';
import { Prd } from '../../src/types/prd.js';

describe('StoryPicker', () => {
  const createTestPrd = (): Prd => ({
    project: 'TestProject',
    branchName: 'gushter/test',
    description: 'Test PRD',
    userStories: [
      {
        id: 'US-001',
        title: 'First Story',
        description: 'First story description',
        acceptanceCriteria: ['Criterion 1'],
        priority: 1,
        passes: false,
        notes: '',
      },
      {
        id: 'US-002',
        title: 'Second Story',
        description: 'Second story description',
        acceptanceCriteria: ['Criterion 2'],
        priority: 2,
        passes: false,
        notes: '',
      },
      {
        id: 'US-003',
        title: 'Third Story',
        description: 'Third story description',
        acceptanceCriteria: ['Criterion 3'],
        priority: 3,
        passes: true,
        notes: '',
      },
    ],
  });

  describe('getNextStory', () => {
    it('should return highest priority incomplete story', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd);

      const story = picker.getNextStory();

      expect(story).not.toBeNull();
      expect(story?.id).toBe('US-001');
    });

    it('should skip blocked stories', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd, { blockedStories: ['US-001'] });

      const story = picker.getNextStory();

      expect(story).not.toBeNull();
      expect(story?.id).toBe('US-002');
    });

    it('should return target story if specified', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd, { targetStory: 'US-002' });

      const story = picker.getNextStory();

      expect(story).not.toBeNull();
      expect(story?.id).toBe('US-002');
    });

    it('should return null if target story is complete', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd, { targetStory: 'US-003' });

      const story = picker.getNextStory();

      expect(story).toBeNull();
    });

    it('should return null when all stories are complete or blocked', () => {
      const prd = createTestPrd();
      prd.userStories[0]!.passes = true;
      const picker = new StoryPicker(prd, { blockedStories: ['US-002'] });

      const story = picker.getNextStory();

      expect(story).toBeNull();
    });
  });

  describe('getRemainingStories', () => {
    it('should return incomplete, unblocked stories sorted by priority', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd);

      const remaining = picker.getRemainingStories();

      expect(remaining).toHaveLength(2);
      expect(remaining[0]?.id).toBe('US-001');
      expect(remaining[1]?.id).toBe('US-002');
    });
  });

  describe('isAllComplete', () => {
    it('should return false when stories remain', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd);

      expect(picker.isAllComplete()).toBe(false);
    });

    it('should return true when all stories pass', () => {
      const prd = createTestPrd();
      prd.userStories.forEach((s) => (s.passes = true));
      const picker = new StoryPicker(prd);

      expect(picker.isAllComplete()).toBe(true);
    });
  });

  describe('isAllCompletedOrBlocked', () => {
    it('should return true when remaining stories are blocked', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd, { blockedStories: ['US-001', 'US-002'] });

      expect(picker.isAllCompletedOrBlocked()).toBe(true);
    });
  });

  describe('counts', () => {
    it('should return correct counts', () => {
      const prd = createTestPrd();
      const picker = new StoryPicker(prd, { blockedStories: ['US-002'] });

      expect(picker.getTotalCount()).toBe(3);
      expect(picker.getCompletedCount()).toBe(1);
      expect(picker.getBlockedCount()).toBe(1);
    });
  });
});
