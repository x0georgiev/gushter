import { z } from 'zod';

export const VerificationCommandSchema = z.object({
  name: z.string(),
  command: z.string(),
  optional: z.boolean().optional().default(false),
});

export const RetryConfigSchema = z.object({
  initialDelayMs: z.number().optional().default(2000),
  backoffMultiplier: z.number().optional().default(2),
  maxDelayMs: z.number().optional().default(60000),
});

export const GushterConfigSchema = z.object({
  maxIterations: z.number().optional().default(10),
  maxRetriesPerStory: z.number().optional().default(3),
  retry: RetryConfigSchema.optional().default({}),
  verification: z
    .object({
      commands: z.array(VerificationCommandSchema).optional().default([]),
    })
    .optional()
    .default({}),
  prdPath: z.string().optional().default('prd.json'),
  progressPath: z.string().optional().default('progress.txt'),
  claudeMdPath: z.string().optional().default('CLAUDE.md'),
});

export type VerificationCommand = z.infer<typeof VerificationCommandSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type GushterConfig = z.infer<typeof GushterConfigSchema>;

export const DEFAULT_CONFIG: GushterConfig = GushterConfigSchema.parse({});
