import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { GushterStateSchema, GushterState } from '../../types/state.js';
import { GitManager } from '../../core/git-manager.js';

export interface RollbackOptions {
  all?: boolean;
  force?: boolean;
}

const STATE_DIR = '.gushter';
const STATE_FILE = 'state.json';

function loadState(cwd: string): GushterState | null {
  const statePath = resolve(cwd, STATE_DIR, STATE_FILE);
  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    return GushterStateSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

function saveState(cwd: string, state: GushterState): void {
  const statePath = resolve(cwd, STATE_DIR, STATE_FILE);
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export async function rollbackCommand(
  storyId?: string,
  options: RollbackOptions = {}
): Promise<void> {
  const cwd = process.cwd();
  const state = loadState(cwd);
  const gitManager = new GitManager(cwd);

  if (!state) {
    logger.error('No state file found. Nothing to rollback.');
    process.exit(1);
  }

  if (options.all) {
    logger.header('Rolling Back All Iterations');

    const firstIteration = state.iterations[0];
    if (!firstIteration) {
      logger.warn('No iterations to rollback');
      return;
    }

    if (!options.force) {
      logger.warn(
        `This will reset to ${chalk.cyan(firstIteration.startSha)}`
      );
      logger.info('Use --force to confirm');
      return;
    }

    try {
      await gitManager.resetToSha(firstIteration.startSha);
      state.iterations = [];
      state.currentIteration = 0;
      state.blockedStories = [];
      state.lastUpdatedAt = new Date().toISOString();
      saveState(cwd, state);
      logger.success('Rolled back all iterations');
    } catch (error) {
      logger.error(`Rollback failed: ${error}`);
      process.exit(1);
    }

    return;
  }

  if (!storyId) {
    logger.error('Please specify a story ID or use --all');
    logger.info('Usage: gushter rollback <storyId> [--force]');
    logger.info('       gushter rollback --all [--force]');
    process.exit(1);
  }

  logger.header(`Rolling Back Story: ${storyId}`);

  const iteration = state.iterations.find((i) => i.storyId === storyId);
  if (!iteration) {
    logger.error(`No iteration found for story: ${storyId}`);
    process.exit(1);
  }

  if (!options.force) {
    logger.warn(`This will reset to ${chalk.cyan(iteration.startSha)}`);
    logger.info('Use --force to confirm');
    return;
  }

  try {
    await gitManager.resetToSha(iteration.startSha);

    // Update state: mark this and all subsequent iterations as rolled_back
    const iterationIndex = state.iterations.findIndex(
      (i) => i.storyId === storyId
    );
    for (let i = iterationIndex; i < state.iterations.length; i++) {
      const iter = state.iterations[i];
      if (iter) {
        iter.status = 'rolled_back';
      }
    }

    // Remove blocked status if it was blocked
    state.blockedStories = state.blockedStories.filter((s) => s !== storyId);
    state.lastUpdatedAt = new Date().toISOString();

    saveState(cwd, state);
    logger.success(`Rolled back story ${storyId}`);
  } catch (error) {
    logger.error(`Rollback failed: ${error}`);
    process.exit(1);
  }
}
