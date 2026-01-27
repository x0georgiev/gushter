import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GushterConfig } from '../config/schema.js';
import { logger } from '../utils/logger.js';

export interface AiRunnerOptions {
  cwd: string;
  claudeMdPath: string;
  dryRun?: boolean;
}

export interface AiRunResult {
  output: string;
  exitCode: number;
  success: boolean;
}

export class AiRunner {
  private cwd: string;
  private claudeMdPath: string;
  private dryRun: boolean;

  constructor(options: AiRunnerOptions) {
    this.cwd = options.cwd;
    this.claudeMdPath = options.claudeMdPath;
    this.dryRun = options.dryRun ?? false;
  }

  async run(): Promise<AiRunResult> {
    if (this.dryRun) {
      return this.simulateRun();
    }

    const absolutePromptPath = resolve(this.cwd, this.claudeMdPath);

    let promptContent: string;
    try {
      promptContent = readFileSync(absolutePromptPath, 'utf-8');
    } catch {
      throw new Error(`Failed to read prompt file: ${absolutePromptPath}`);
    }

    return this.runClaude(promptContent);
  }

  private async runClaude(prompt: string): Promise<AiRunResult> {
    logger.debug('Starting Claude Code...');

    return new Promise((resolve) => {
      const child = spawn('claude', ['--dangerously-skip-permissions', '--print'], {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        process.stdout.write(chunk);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        process.stderr.write(chunk);
      });

      child.stdin?.write(prompt);
      child.stdin?.end();

      child.on('close', (code) => {
        const exitCode = code ?? 1;
        resolve({
          output: stdout + stderr,
          exitCode,
          success: exitCode === 0,
        });
      });

      child.on('error', (error) => {
        resolve({
          output: `Failed to spawn claude: ${error.message}`,
          exitCode: 1,
          success: false,
        });
      });
    });
  }

  private simulateRun(): AiRunResult {
    logger.info('[DRY RUN] Would execute Claude Code here');

    const simulatedOutput = `
[DRY RUN] Simulated AI execution
- Would read prompt from ${this.claudeMdPath}
- Would spawn claude with --dangerously-skip-permissions --print
- No actual changes made

\`\`\`json:gushter-output
{
  "status": "success",
  "storyId": "SIMULATED",
  "filesChanged": [],
  "learnings": ["This was a dry run"],
  "error": null,
  "nextAction": "continue"
}
\`\`\`
`;

    return {
      output: simulatedOutput,
      exitCode: 0,
      success: true,
    };
  }
}

export function createAiRunner(config: GushterConfig, cwd: string, dryRun: boolean = false): AiRunner {
  return new AiRunner({
    cwd,
    claudeMdPath: config.claudeMdPath,
    dryRun,
  });
}
