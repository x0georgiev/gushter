import { z } from 'zod';

export const OutputStatusSchema = z.enum(['success', 'failure']);
export const NextActionSchema = z.enum(['continue', 'complete', 'blocked']);

export const StructuredOutputSchema = z.object({
  status: OutputStatusSchema,
  storyId: z.string(),
  filesChanged: z.array(z.string()).optional().default([]),
  learnings: z.array(z.string()).optional().default([]),
  error: z.string().nullable().optional(),
  nextAction: NextActionSchema,
});

export type OutputStatus = z.infer<typeof OutputStatusSchema>;
export type NextAction = z.infer<typeof NextActionSchema>;
export type StructuredOutput = z.infer<typeof StructuredOutputSchema>;

export interface ParsedOutput {
  structured: StructuredOutput | null;
  rawOutput: string;
}
