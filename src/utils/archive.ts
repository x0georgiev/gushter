import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { logger } from './logger.js';

const LAST_BRANCH_FILE = '.last-branch';
const ARCHIVE_DIR = 'archive';

export interface ArchiveOptions {
  cwd: string;
  prdPath: string;
  progressPath: string;
}

export class ArchiveManager {
  private prdPath: string;
  private progressPath: string;
  private lastBranchPath: string;
  private archiveDir: string;

  constructor(options: ArchiveOptions) {
    this.prdPath = resolve(options.cwd, options.prdPath);
    this.progressPath = resolve(options.cwd, options.progressPath);
    this.lastBranchPath = resolve(options.cwd, LAST_BRANCH_FILE);
    this.archiveDir = resolve(options.cwd, ARCHIVE_DIR);
  }

  getLastBranch(): string | null {
    if (!existsSync(this.lastBranchPath)) {
      return null;
    }
    try {
      return readFileSync(this.lastBranchPath, 'utf-8').trim();
    } catch {
      return null;
    }
  }

  saveLastBranch(branchName: string): void {
    writeFileSync(this.lastBranchPath, branchName);
  }

  shouldArchive(currentBranch: string): boolean {
    const lastBranch = this.getLastBranch();
    return lastBranch !== null && lastBranch !== currentBranch;
  }

  archive(branchName: string): string | null {
    if (!existsSync(this.prdPath) && !existsSync(this.progressPath)) {
      logger.debug('No files to archive');
      return null;
    }

    const date = new Date().toISOString().split('T')[0];
    const folderName = branchName.replace(/^gushter\//, '');
    const archivePath = resolve(this.archiveDir, `${date}-${folderName}`);

    mkdirSync(archivePath, { recursive: true });

    if (existsSync(this.prdPath)) {
      copyFileSync(this.prdPath, resolve(archivePath, 'prd.json'));
    }

    if (existsSync(this.progressPath)) {
      copyFileSync(this.progressPath, resolve(archivePath, 'progress.txt'));
    }

    logger.info(`Archived previous run to: ${archivePath}`);
    return archivePath;
  }

  resetProgressFile(): void {
    const content = `# Gushter Progress Log
Started: ${new Date().toISOString()}
---
`;
    mkdirSync(dirname(this.progressPath), { recursive: true });
    writeFileSync(this.progressPath, content);
  }

  archiveIfBranchChanged(currentBranch: string): void {
    if (this.shouldArchive(currentBranch)) {
      const lastBranch = this.getLastBranch();
      if (lastBranch) {
        this.archive(lastBranch);
        this.resetProgressFile();
      }
    }
    this.saveLastBranch(currentBranch);
  }

  initializeProgressFile(): void {
    if (!existsSync(this.progressPath)) {
      this.resetProgressFile();
    }
  }
}
