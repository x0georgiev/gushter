#!/usr/bin/env node

import { Command } from 'commander';
import { runCommand } from './cli/commands/run.js';
import { statusCommand } from './cli/commands/status.js';
import { rollbackCommand } from './cli/commands/rollback.js';
import { initCommand } from './cli/commands/init.js';
import { prdCommand } from './cli/commands/prd.js';
import { prdConvertCommand } from './cli/commands/prd-convert.js';

const program = new Command();

program
  .name('gushter')
  .description('Autonomous AI agent loop for iterative code development with Claude Code')
  .version('1.0.0');

program
  .command('run')
  .description('Run the agent loop')
  .option('-n, --max-iterations <n>', 'Maximum iterations', parseInt)
  .option('--dry-run', 'Simulate without making changes')
  .option('--no-dashboard', 'Disable terminal UI')
  .option('-s, --story <id>', 'Run specific story only')
  .option('-r, --resume', 'Resume from saved state')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await runCommand({
      maxIterations: options.maxIterations,
      dryRun: options.dryRun,
      dashboard: options.dashboard,
      story: options.story,
      resume: options.resume,
      verbose: options.verbose,
    });
  });

program
  .command('status')
  .description('Show current state')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    await statusCommand({
      verbose: options.verbose,
    });
  });

program
  .command('rollback [storyId]')
  .description('Rollback a specific story or all iterations')
  .option('-a, --all', 'Rollback all iterations')
  .option('-f, --force', 'Force rollback without confirmation')
  .action(async (storyId, options) => {
    await rollbackCommand(storyId, {
      all: options.all,
      force: options.force,
    });
  });

program
  .command('init')
  .description('Initialize gushter in current directory')
  .option('-f, --force', 'Overwrite existing files')
  .option('--no-prd', 'Skip creating prd.json (use with gushter prd workflow)')
  .action(async (options) => {
    await initCommand({
      force: options.force,
      noPrd: !options.prd,
    });
  });

program
  .command('prd')
  .description('Create a PRD interactively with Claude Code')
  .option('-o, --output <file>', 'Output file path', 'prd.md')
  .option('-f, --force', 'Overwrite existing file')
  .action(async (options) => {
    await prdCommand({
      output: options.output,
      force: options.force,
    });
  });

program
  .command('prd-convert')
  .description('Convert prd.md to prd.json')
  .option('-i, --input <file>', 'Input PRD markdown file', 'prd.md')
  .option('-o, --output <file>', 'Output JSON file', 'prd.json')
  .option('-f, --force', 'Overwrite existing file')
  .action(async (options) => {
    await prdConvertCommand({
      input: options.input,
      output: options.output,
      force: options.force,
    });
  });

program.parse();
