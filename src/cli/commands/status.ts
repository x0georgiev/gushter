import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/loader.js';
import { GushterStateSchema, GushterState, IterationStatus } from '../../types/state.js';
import { PrdSchema, Prd } from '../../types/prd.js';

export interface StatusOptions {
  verbose?: boolean;
}

const STATE_DIR = '.gushter';
const STATE_FILE = 'state.json';

function getStatusColor(status: IterationStatus): (s: string) => string {
  switch (status) {
    case 'completed':
      return chalk.green;
    case 'in_progress':
      return chalk.yellow;
    case 'failed':
      return chalk.red;
    case 'blocked':
      return chalk.magenta;
    case 'rolled_back':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

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

function loadPrd(prdPath: string): Prd | null {
  if (!existsSync(prdPath)) {
    return null;
  }

  try {
    const content = readFileSync(prdPath, 'utf-8');
    return PrdSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const config = loadConfig({ cwd });
  const state = loadState(cwd);
  const prd = loadPrd(resolve(cwd, config.prdPath));

  logger.header('Gushter Status');
  logger.newline();

  if (!prd) {
    logger.warn('No prd.json found');
    logger.info(`Expected at: ${resolve(cwd, config.prdPath)}`);
    return;
  }

  logger.info(`Project: ${chalk.cyan(prd.project)}`);
  logger.info(`Branch: ${chalk.cyan(prd.branchName)}`);
  logger.info(`Description: ${prd.description}`);
  logger.newline();

  const totalStories = prd.userStories.length;
  const completedStories = prd.userStories.filter((s) => s.passes).length;
  const remainingStories = totalStories - completedStories;

  logger.info(
    `Stories: ${chalk.green(completedStories.toString())}/${totalStories} complete`
  );

  if (state) {
    logger.info(
      `Iteration: ${state.currentIteration}/${state.maxIterations}`
    );
    if (state.blockedStories.length > 0) {
      logger.warn(
        `Blocked stories: ${chalk.red(state.blockedStories.join(', '))}`
      );
    }
  } else {
    logger.info('No active run (state file not found)');
  }

  logger.newline();
  logger.info('User Stories:');

  for (const story of prd.userStories.sort((a, b) => a.priority - b.priority)) {
    const statusIcon = story.passes ? chalk.green('✓') : chalk.gray('○');
    const storyStatus = story.passes ? chalk.green('PASS') : chalk.gray('PENDING');

    logger.raw(
      `  ${statusIcon} [${story.priority}] ${chalk.bold(story.id)}: ${story.title} ${chalk.dim(`(${storyStatus})`)}`
    );

    if (options.verbose) {
      logger.raw(chalk.dim(`      ${story.description}`));
      for (const criterion of story.acceptanceCriteria) {
        logger.raw(chalk.dim(`      - ${criterion}`));
      }
    }
  }

  if (state && options.verbose) {
    logger.newline();
    logger.info('Iteration History:');

    for (const iteration of state.iterations) {
      const color = getStatusColor(iteration.status);
      logger.raw(
        `  ${color(iteration.status.toUpperCase().padEnd(12))} ${iteration.storyId} (retries: ${iteration.retryCount})`
      );
      if (iteration.error) {
        logger.raw(chalk.dim(`      Error: ${iteration.error}`));
      }
    }
  }

  logger.newline();

  if (remainingStories === 0) {
    logger.success('All stories complete!');
  } else {
    logger.info(`${remainingStories} stories remaining`);
  }
}
