import { z } from 'zod';

export const UserStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.number(),
  passes: z.boolean(),
  notes: z.string().optional().default(''),
});

export const PrdSchema = z.object({
  project: z.string(),
  branchName: z.string(),
  description: z.string(),
  userStories: z.array(UserStorySchema),
});

export type UserStory = z.infer<typeof UserStorySchema>;
export type Prd = z.infer<typeof PrdSchema>;
