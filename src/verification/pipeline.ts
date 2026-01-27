import { execSync } from 'node:child_process';
import { VerificationCommand } from '../config/schema.js';
import { logger } from '../utils/logger.js';

export interface VerificationResult {
  name: string;
  command: string;
  success: boolean;
  output: string;
  durationMs: number;
}

export interface PipelineResult {
  success: boolean;
  results: VerificationResult[];
  totalDurationMs: number;
}

export class VerificationPipeline {
  private commands: VerificationCommand[];
  private cwd: string;
  private dryRun: boolean;

  constructor(commands: VerificationCommand[], cwd: string, dryRun: boolean = false) {
    this.commands = commands;
    this.cwd = cwd;
    this.dryRun = dryRun;
  }

  async run(): Promise<PipelineResult> {
    const results: VerificationResult[] = [];
    const startTime = Date.now();
    let allPassed = true;

    if (this.commands.length === 0) {
      logger.debug('No verification commands configured');
      return {
        success: true,
        results: [],
        totalDurationMs: 0,
      };
    }

    logger.info('Running verification pipeline...');

    for (const command of this.commands) {
      const result = await this.runCommand(command);
      results.push(result);

      if (result.success) {
        logger.success(`  ${command.name}: passed`);
      } else if (command.optional) {
        logger.warn(`  ${command.name}: failed (optional)`);
      } else {
        logger.error(`  ${command.name}: failed`);
        allPassed = false;
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      success: allPassed,
      results,
      totalDurationMs,
    };
  }

  private async runCommand(command: VerificationCommand): Promise<VerificationResult> {
    const startTime = Date.now();

    if (this.dryRun) {
      logger.debug(`[DRY RUN] Would run: ${command.command}`);
      return {
        name: command.name,
        command: command.command,
        success: true,
        output: '[DRY RUN] Simulated success',
        durationMs: 0,
      };
    }

    try {
      const output = execSync(command.command, {
        cwd: this.cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000, // 5 minute timeout
      });

      return {
        name: command.name,
        command: command.command,
        success: true,
        output: output.trim(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      let output = '';
      if (error instanceof Error) {
        if ('stdout' in error) {
          output += String(error.stdout);
        }
        if ('stderr' in error) {
          output += String(error.stderr);
        }
        if (!output) {
          output = error.message;
        }
      }

      return {
        name: command.name,
        command: command.command,
        success: false,
        output: output.trim(),
        durationMs: Date.now() - startTime,
      };
    }
  }

  getCommands(): VerificationCommand[] {
    return [...this.commands];
  }
}
