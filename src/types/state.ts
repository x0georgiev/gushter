import { z } from 'zod';

export const IterationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'blocked',
  'rolled_back',
]);

export const IterationSchema = z.object({
  storyId: z.string(),
  status: IterationStatusSchema,
  startSha: z.string(),
  endSha: z.string().optional(),
  retryCount: z.number().default(0),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export const GushterStateSchema = z.object({
  version: z.literal(1),
  branchName: z.string(),
  currentIteration: z.number(),
  maxIterations: z.number(),
  iterations: z.array(IterationSchema),
  blockedStories: z.array(z.string()),
  startedAt: z.string(),
  lastUpdatedAt: z.string(),
});

export type IterationStatus = z.infer<typeof IterationStatusSchema>;
export type Iteration = z.infer<typeof IterationSchema>;
export type GushterState = z.infer<typeof GushterStateSchema>;

export function createInitialState(
  branchName: string,
  maxIterations: number
): GushterState {
  const now = new Date().toISOString();
  return {
    version: 1,
    branchName,
    currentIteration: 0,
    maxIterations,
    iterations: [],
    blockedStories: [],
    startedAt: now,
    lastUpdatedAt: now,
  };
}
