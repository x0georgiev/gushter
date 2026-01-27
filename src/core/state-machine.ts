import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  GushterState,
  GushterStateSchema,
  Iteration,
  IterationStatus,
  createInitialState,
} from '../types/state.js';
import { GitManager } from './git-manager.js';
import { logger } from '../utils/logger.js';

const STATE_DIR = '.gushter';
const STATE_FILE = 'state.json';

export interface StateMachineOptions {
  cwd: string;
  maxIterations: number;
  branchName: string;
}

export class StateMachine {
  private state: GushterState;
  private statePath: string;
  private gitManager: GitManager;

  constructor(options: StateMachineOptions) {
    this.statePath = resolve(options.cwd, STATE_DIR, STATE_FILE);
    this.gitManager = new GitManager(options.cwd);

    const existingState = this.loadState();

    if (existingState && existingState.branchName === options.branchName) {
      this.state = existingState;
    } else {
      this.state = createInitialState(options.branchName, options.maxIterations);
    }

    this.state.maxIterations = options.maxIterations;
  }

  private loadState(): GushterState | null {
    if (!existsSync(this.statePath)) {
      return null;
    }

    try {
      const content = readFileSync(this.statePath, 'utf-8');
      return GushterStateSchema.parse(JSON.parse(content));
    } catch (error) {
      logger.warn(`Failed to load state: ${error}`);
      return null;
    }
  }

  private saveState(): void {
    mkdirSync(dirname(this.statePath), { recursive: true });
    this.state.lastUpdatedAt = new Date().toISOString();
    writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  getState(): GushterState {
    return { ...this.state };
  }

  getCurrentIteration(): number {
    return this.state.currentIteration;
  }

  getIterationHistory(): Iteration[] {
    return [...this.state.iterations];
  }

  getBlockedStories(): string[] {
    return [...this.state.blockedStories];
  }

  isStoryBlocked(storyId: string): boolean {
    return this.state.blockedStories.includes(storyId);
  }

  canStartNewIteration(): boolean {
    return this.state.currentIteration < this.state.maxIterations;
  }

  startIteration(storyId: string): Iteration {
    const startSha = this.gitManager.getCurrentSha();
    const existingIteration = this.state.iterations.find(
      (i) => i.storyId === storyId && i.status !== 'rolled_back'
    );

    const retryCount = existingIteration?.retryCount ?? 0;

    const iteration: Iteration = {
      storyId,
      status: 'in_progress',
      startSha,
      retryCount,
      startedAt: new Date().toISOString(),
    };

    // Remove any existing non-rolled-back iteration for this story
    this.state.iterations = this.state.iterations.filter(
      (i) => i.storyId !== storyId || i.status === 'rolled_back'
    );

    this.state.iterations.push(iteration);
    this.state.currentIteration++;
    this.saveState();

    logger.debug(`Started iteration for ${storyId} (retry ${retryCount})`);
    return iteration;
  }

  completeIteration(storyId: string): void {
    const iteration = this.findIteration(storyId);
    if (!iteration) {
      throw new Error(`No iteration found for story: ${storyId}`);
    }

    iteration.status = 'completed';
    iteration.endSha = this.gitManager.getCurrentSha();
    iteration.completedAt = new Date().toISOString();
    this.saveState();

    logger.debug(`Completed iteration for ${storyId}`);
  }

  failIteration(storyId: string, error: string, maxRetries: number): IterationStatus {
    const iteration = this.findIteration(storyId);
    if (!iteration) {
      throw new Error(`No iteration found for story: ${storyId}`);
    }

    iteration.retryCount++;
    iteration.error = error;
    iteration.completedAt = new Date().toISOString();

    if (iteration.retryCount >= maxRetries) {
      iteration.status = 'blocked';
      this.state.blockedStories.push(storyId);
      logger.warn(`Story ${storyId} blocked after ${maxRetries} retries`);
    } else {
      iteration.status = 'failed';
      logger.debug(`Iteration failed for ${storyId} (attempt ${iteration.retryCount})`);
    }

    this.saveState();
    return iteration.status;
  }

  markRolledBack(storyId: string): void {
    const iteration = this.findIteration(storyId);
    if (iteration) {
      iteration.status = 'rolled_back';
      this.state.blockedStories = this.state.blockedStories.filter(
        (s) => s !== storyId
      );
      this.saveState();
    }
  }

  unblockStory(storyId: string): void {
    this.state.blockedStories = this.state.blockedStories.filter(
      (s) => s !== storyId
    );
    this.saveState();
  }

  private findIteration(storyId: string): Iteration | undefined {
    return this.state.iterations.find(
      (i) => i.storyId === storyId && i.status === 'in_progress'
    );
  }

  getLastIterationForStory(storyId: string): Iteration | undefined {
    const iterations = this.state.iterations
      .filter((i) => i.storyId === storyId)
      .sort((a, b) => {
        const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return bTime - aTime;
      });
    return iterations[0];
  }

  reset(): void {
    this.state = createInitialState(
      this.state.branchName,
      this.state.maxIterations
    );
    this.saveState();
  }
}
