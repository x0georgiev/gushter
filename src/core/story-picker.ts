import { Prd, UserStory } from '../types/prd.js';

export interface StoryPickerOptions {
  blockedStories?: string[];
  targetStory?: string;
}

export class StoryPicker {
  private prd: Prd;
  private blockedStories: Set<string>;
  private targetStory?: string;

  constructor(prd: Prd, options: StoryPickerOptions = {}) {
    this.prd = prd;
    this.blockedStories = new Set(options.blockedStories ?? []);
    this.targetStory = options.targetStory;
  }

  updateBlockedStories(blocked: string[]): void {
    this.blockedStories = new Set(blocked);
  }

  getNextStory(): UserStory | null {
    // If a specific story is targeted, return it if not complete
    if (this.targetStory) {
      const story = this.prd.userStories.find((s) => s.id === this.targetStory);
      if (story && !story.passes && !this.blockedStories.has(story.id)) {
        return story;
      }
      return null;
    }

    // Get all incomplete, unblocked stories sorted by priority
    const candidates = this.prd.userStories
      .filter((s) => !s.passes && !this.blockedStories.has(s.id))
      .sort((a, b) => a.priority - b.priority);

    return candidates[0] ?? null;
  }

  getRemainingStories(): UserStory[] {
    return this.prd.userStories
      .filter((s) => !s.passes && !this.blockedStories.has(s.id))
      .sort((a, b) => a.priority - b.priority);
  }

  getCompletedStories(): UserStory[] {
    return this.prd.userStories.filter((s) => s.passes);
  }

  getBlockedStoriesList(): UserStory[] {
    return this.prd.userStories.filter((s) => this.blockedStories.has(s.id));
  }

  isAllComplete(): boolean {
    return this.prd.userStories.every((s) => s.passes);
  }

  isAllCompletedOrBlocked(): boolean {
    return this.prd.userStories.every(
      (s) => s.passes || this.blockedStories.has(s.id)
    );
  }

  getTotalCount(): number {
    return this.prd.userStories.length;
  }

  getCompletedCount(): number {
    return this.prd.userStories.filter((s) => s.passes).length;
  }

  getBlockedCount(): number {
    return Array.from(this.blockedStories).filter((id) =>
      this.prd.userStories.some((s) => s.id === id)
    ).length;
  }
}
