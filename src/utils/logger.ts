import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LoggerOptions {
  verbose?: boolean;
  silent?: boolean;
}

export class Logger {
  private verbose: boolean;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.silent = options.silent ?? false;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.silent && level !== 'error') return;

    const prefix = this.getPrefix(level);
    console.log(prefix, message, ...args);
  }

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return chalk.gray('[DEBUG]');
      case 'info':
        return chalk.blue('[INFO]');
      case 'warn':
        return chalk.yellow('[WARN]');
      case 'error':
        return chalk.red('[ERROR]');
      case 'success':
        return chalk.green('[OK]');
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      this.log('debug', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    this.log('success', message, ...args);
  }

  raw(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  newline(): void {
    if (!this.silent) {
      console.log();
    }
  }

  divider(char = '=', length = 60): void {
    if (!this.silent) {
      console.log(chalk.gray(char.repeat(length)));
    }
  }

  header(title: string): void {
    this.newline();
    this.divider();
    this.raw(chalk.bold(`  ${title}`));
    this.divider();
  }
}

export const logger = new Logger();
