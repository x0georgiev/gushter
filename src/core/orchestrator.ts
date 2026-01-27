import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GushterConfig } from '../config/schema.js';
import { Prd, PrdSchema, UserStory } from '../types/prd.js';
import { StateMachine } from './state-machine.js';
import { StoryPicker } from './story-picker.js';
import { GitManager } from './git-manager.js';
import { AiRunner, createAiRunner } from './ai-runner.js';
import { OutputParser, outputParser } from './output-parser.js';
import { VerificationPipeline } from '../verification/pipeline.js';
import { ArchiveManager } from '../utils/archive.js';
import { logger } from '../utils/logger.js';
import { sleep, calculateBackoffDelay } from '../utils/retry.js';

export interface OrchestratorOptions {
  config: GushterConfig;
  cwd: string;
  dryRun: boolean;
  targetStory?: string;
  resume?: boolean;
  showDashboard?: boolean;
}

export interface OrchestratorResult {
  success: boolean;
  totalStories: number;
  completedStories: number;
  blockedStories: string[];
  iterationsUsed: number;
  reachedMaxIterations: boolean;
}

export class Orchestrator {
  private config: GushterConfig;
  private cwd: string;
  private dryRun: boolean;
  private targetStory?: string;

  private prd!: Prd;
  private stateMachine!: StateMachine;
  private storyPicker!: StoryPicker;
  private gitManager!: GitManager;
  private aiRunner!: AiRunner;
  private parser: OutputParser;
  private verificationPipeline!: VerificationPipeline;
  private archiveManager!: ArchiveManager;

  constructor(options: OrchestratorOptions) {
    this.config = options.config;
    this.cwd = options.cwd;
    this.dryRun = options.dryRun;
    this.targetStory = options.targetStory;
    // Dashboard feature: options.showDashboard (reserved for future)
    this.parser = outputParser;
  }

  async run(): Promise<OrchestratorResult> {
    // Initialize components
    await this.initialize();

    let iterationsUsed = 0;

    // Main loop
    while (this.stateMachine.canStartNewIteration()) {
      // Update blocked stories in picker
      this.storyPicker.updateBlockedStories(this.stateMachine.getBlockedStories());

      // Check if all stories are complete or blocked
      if (this.storyPicker.isAllCompletedOrBlocked()) {
        break;
      }

      // Pick next story
      const story = this.storyPicker.getNextStory();
      if (!story) {
        logger.warn('No more stories to work on');
        break;
      }

      // Run iteration
      const iterationResult = await this.runIteration(story);
      iterationsUsed++;

      if (iterationResult.complete) {
        logger.success('All stories complete!');
        break;
      }

      // Brief pause between iterations
      if (!this.dryRun) {
        await sleep(2000);
      }
    }

    // Generate result
    const blockedStories = this.stateMachine.getBlockedStories();
    const completedCount = this.storyPicker.getCompletedCount();
    const totalCount = this.storyPicker.getTotalCount();

    return {
      success: this.storyPicker.isAllComplete(),
      totalStories: totalCount,
      completedStories: completedCount,
      blockedStories,
      iterationsUsed,
      reachedMaxIterations: !this.stateMachine.canStartNewIteration(),
    };
  }

  private async initialize(): Promise<void> {
    // Load PRD
    this.prd = this.loadPrd();

    // Initialize Git manager
    this.gitManager = new GitManager(this.cwd);

    // Initialize archive manager
    this.archiveManager = new ArchiveManager({
      cwd: this.cwd,
      prdPath: this.config.prdPath,
      progressPath: this.config.progressPath,
    });

    // Archive if branch changed
    this.archiveManager.archiveIfBranchChanged(this.prd.branchName);
    this.archiveManager.initializeProgressFile();

    // Ensure we're on the correct branch
    await this.ensureCorrectBranch();

    // Initialize state machine
    this.stateMachine = new StateMachine({
      cwd: this.cwd,
      maxIterations: this.config.maxIterations,
      branchName: this.prd.branchName,
    });

    // Initialize story picker
    this.storyPicker = new StoryPicker(this.prd, {
      blockedStories: this.stateMachine.getBlockedStories(),
      targetStory: this.targetStory,
    });

    // Initialize AI runner
    this.aiRunner = createAiRunner(this.config, this.cwd, this.dryRun);

    // Initialize verification pipeline
    this.verificationPipeline = new VerificationPipeline(
      this.config.verification.commands,
      this.cwd,
      this.dryRun
    );
  }

  private loadPrd(): Prd {
    const prdPath = resolve(this.cwd, this.config.prdPath);

    if (!existsSync(prdPath)) {
      throw new Error(`PRD not found: ${prdPath}`);
    }

    try {
      const content = readFileSync(prdPath, 'utf-8');
      return PrdSchema.parse(JSON.parse(content));
    } catch (error) {
      throw new Error(`Failed to load PRD: ${error}`);
    }
  }

  private savePrd(): void {
    const prdPath = resolve(this.cwd, this.config.prdPath);
    writeFileSync(prdPath, JSON.stringify(this.prd, null, 2));
  }

  private async ensureCorrectBranch(): Promise<void> {
    const currentBranch = this.gitManager.getCurrentBranch();
    const targetBranch = this.prd.branchName;

    if (currentBranch !== targetBranch) {
      logger.info(`Switching to branch: ${targetBranch}`);
      const mainBranch = this.gitManager.getMainBranch();
      this.gitManager.checkoutOrCreate(targetBranch, mainBranch);
    }
  }

  private async runIteration(story: UserStory): Promise<{ complete: boolean }> {
    const iterationNum = this.stateMachine.getCurrentIteration() + 1;
    const maxIterations = this.config.maxIterations;

    logger.header(`Iteration ${iterationNum}/${maxIterations}: ${story.id}`);
    logger.info(`Story: ${story.title}`);
    logger.newline();

    // Start iteration in state machine
    const iteration = this.stateMachine.startIteration(story.id);

    try {
      // Run AI tool
      logger.info('Running AI agent...');
      const aiResult = await this.aiRunner.run();

      // Parse output
      const parsed = this.parser.parse(aiResult.output);

      // Check for completion signal
      if (this.parser.isComplete(parsed)) {
        // Mark story as passing
        this.markStoryComplete(story.id);
        this.stateMachine.completeIteration(story.id);

        // Check if all stories are complete
        if (this.storyPicker.isAllComplete()) {
          return { complete: true };
        }
      }

      // Check if AI reported success
      if (this.parser.isSuccess(parsed)) {
        // Run verification pipeline
        const verificationResult = await this.verificationPipeline.run();

        if (verificationResult.success) {
          // Mark story as passing
          this.markStoryComplete(story.id);
          this.stateMachine.completeIteration(story.id);
          logger.success(`Story ${story.id} completed successfully`);
        } else {
          // Verification failed - handle retry
          await this.handleFailure(
            story.id,
            'Verification failed',
            iteration.startSha
          );
        }
      } else {
        // AI reported failure
        const error = this.parser.getError(parsed) ?? 'AI reported failure';
        await this.handleFailure(story.id, error, iteration.startSha);
      }

      // Check for blocked status
      if (this.parser.isBlocked(parsed)) {
        this.stateMachine.failIteration(
          story.id,
          'AI reported blocked',
          1 // Immediately block
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.handleFailure(story.id, errorMsg, iteration.startSha);
    }

    return { complete: false };
  }

  private async handleFailure(
    storyId: string,
    error: string,
    startSha: string
  ): Promise<void> {
    logger.error(`Iteration failed: ${error}`);

    // Rollback to start SHA
    if (!this.dryRun) {
      logger.info('Rolling back changes...');
      await this.gitManager.resetToSha(startSha);
    }

    // Update state machine
    const status = this.stateMachine.failIteration(
      storyId,
      error,
      this.config.maxRetriesPerStory
    );

    if (status === 'blocked') {
      logger.error(`Story ${storyId} is now blocked after max retries`);
    } else {
      // Calculate retry delay
      const lastIteration = this.stateMachine.getLastIterationForStory(storyId);
      const retryCount = lastIteration?.retryCount ?? 1;
      const delay = calculateBackoffDelay(retryCount, this.config.retry);

      logger.info(`Will retry in ${delay}ms (attempt ${retryCount + 1})`);
      if (!this.dryRun) {
        await sleep(delay);
      }
    }
  }

  private markStoryComplete(storyId: string): void {
    const story = this.prd.userStories.find((s) => s.id === storyId);
    if (story) {
      story.passes = true;
      this.savePrd();
    }
  }
}
