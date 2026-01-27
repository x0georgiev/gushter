import { execSync, ExecSyncOptions } from 'node:child_process';
import { logger } from '../utils/logger.js';

export interface GitStatus {
  branch: string;
  sha: string;
  hasChanges: boolean;
  hasUntracked: boolean;
}

export class GitManager {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  private exec(command: string, options?: ExecSyncOptions): string {
    try {
      const result = execSync(command, {
        cwd: this.cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options,
      });
      return String(result).trim();
    } catch (error) {
      if (error instanceof Error && 'stderr' in error) {
        throw new Error(`Git command failed: ${error.message}`);
      }
      throw error;
    }
  }

  getCurrentSha(): string {
    return this.exec('git rev-parse HEAD');
  }

  getCurrentBranch(): string {
    return this.exec('git rev-parse --abbrev-ref HEAD');
  }

  getStatus(): GitStatus {
    const branch = this.getCurrentBranch();
    const sha = this.getCurrentSha();
    const statusOutput = this.exec('git status --porcelain');

    return {
      branch,
      sha,
      hasChanges: statusOutput.length > 0,
      hasUntracked: statusOutput.split('\n').some((line) => line.startsWith('??')),
    };
  }

  branchExists(branchName: string): boolean {
    try {
      this.exec(`git rev-parse --verify ${branchName}`);
      return true;
    } catch {
      return false;
    }
  }

  checkout(branchName: string): void {
    logger.debug(`Checking out branch: ${branchName}`);
    this.exec(`git checkout ${branchName}`);
  }

  createBranch(branchName: string, fromBranch: string = 'main'): void {
    logger.debug(`Creating branch: ${branchName} from ${fromBranch}`);
    this.exec(`git checkout -b ${branchName} ${fromBranch}`);
  }

  checkoutOrCreate(branchName: string, fromBranch: string = 'main'): void {
    if (this.branchExists(branchName)) {
      this.checkout(branchName);
    } else {
      this.createBranch(branchName, fromBranch);
    }
  }

  async resetToSha(sha: string): Promise<void> {
    logger.debug(`Resetting to SHA: ${sha}`);
    this.exec(`git reset --hard ${sha}`);
  }

  stageAll(): void {
    this.exec('git add -A');
  }

  commit(message: string): string {
    this.stageAll();
    this.exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    return this.getCurrentSha();
  }

  hasCommitsSince(sha: string): boolean {
    const currentSha = this.getCurrentSha();
    return currentSha !== sha;
  }

  getCommitsBetween(startSha: string, endSha: string = 'HEAD'): string[] {
    const output = this.exec(
      `git log --format=%H ${startSha}..${endSha}`
    );
    return output.split('\n').filter(Boolean);
  }

  getFilesChangedSince(sha: string): string[] {
    const output = this.exec(`git diff --name-only ${sha} HEAD`);
    return output.split('\n').filter(Boolean);
  }

  isClean(): boolean {
    const status = this.getStatus();
    return !status.hasChanges && !status.hasUntracked;
  }

  getMainBranch(): string {
    try {
      this.exec('git rev-parse --verify main');
      return 'main';
    } catch {
      try {
        this.exec('git rev-parse --verify master');
        return 'master';
      } catch {
        return 'main';
      }
    }
  }
}
