import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { loadConfig, mergeConfigWithCli } from '../../config/loader.js';
import { Orchestrator } from '../../core/orchestrator.js';

export interface RunOptions {
  maxIterations?: number;
  dryRun?: boolean;
  dashboard?: boolean;
  story?: string;
  resume?: boolean;
  verbose?: boolean;
}

export async function runCommand(options: RunOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const fileConfig = loadConfig({ cwd });

  const config = mergeConfigWithCli(fileConfig, {
    maxIterations: options.maxIterations,
  });

  logger.setVerbose(options.verbose ?? false);

  logger.header('Gushter - Autonomous AI Agent Loop');
  logger.newline();
  logger.info(`Max iterations: ${chalk.cyan(config.maxIterations.toString())}`);

  if (options.dryRun) {
    logger.warn('Dry-run mode enabled - no changes will be made');
  }

  if (options.story) {
    logger.info(`Target story: ${chalk.cyan(options.story)}`);
  }

  logger.newline();

  const orchestrator = new Orchestrator({
    config,
    cwd,
    dryRun: options.dryRun ?? false,
    targetStory: options.story,
    resume: options.resume ?? false,
    showDashboard: options.dashboard ?? true,
  });

  try {
    const result = await orchestrator.run();

    logger.newline();

    if (result.success) {
      logger.success('All stories completed successfully!');
    } else if (result.reachedMaxIterations) {
      logger.warn(
        `Reached max iterations (${config.maxIterations}) without completing all stories`
      );
    } else if (result.blockedStories.length > 0) {
      logger.error(
        `Some stories are blocked: ${result.blockedStories.join(', ')}`
      );
    }

    logger.newline();
    logger.info(
      `Completed: ${result.completedStories}/${result.totalStories} stories`
    );
    logger.info(`Iterations used: ${result.iterationsUsed}`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    logger.error(`Orchestrator failed: ${error}`);
    process.exit(1);
  }
}
