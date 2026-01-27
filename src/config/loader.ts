import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GushterConfigSchema, GushterConfig, DEFAULT_CONFIG } from './schema.js';

const CONFIG_FILENAMES = ['gushter.config.json', '.gushterrc.json', '.gushterrc'];

export interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
}

export function findConfigFile(cwd: string = process.cwd()): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const fullPath = resolve(cwd, filename);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function loadConfig(options: LoadConfigOptions = {}): GushterConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? findConfigFile(cwd);

  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(content);
    return GushterConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${configPath}`);
    }
    if (error instanceof Error && 'issues' in error) {
      throw new Error(`Invalid config in ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

export function mergeConfigWithCli(
  config: GushterConfig,
  cliOptions: Partial<GushterConfig>
): GushterConfig {
  return {
    ...config,
    ...Object.fromEntries(
      Object.entries(cliOptions).filter(([_, v]) => v !== undefined)
    ),
  } as GushterConfig;
}
