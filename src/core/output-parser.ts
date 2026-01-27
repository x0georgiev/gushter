import { StructuredOutputSchema, ParsedOutput } from '../types/output.js';
import { logger } from '../utils/logger.js';

const STRUCTURED_OUTPUT_PATTERN = /```json:gushter-output\s*([\s\S]*?)```/;

export class OutputParser {
  parse(output: string): ParsedOutput {
    const result: ParsedOutput = {
      structured: null,
      rawOutput: output,
    };

    // Extract structured JSON output
    const jsonMatch = STRUCTURED_OUTPUT_PATTERN.exec(output);
    if (jsonMatch?.[1]) {
      try {
        const jsonStr = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonStr);
        const validated = StructuredOutputSchema.safeParse(parsed);

        if (validated.success) {
          result.structured = validated.data;
          logger.debug('Parsed structured output successfully');
        } else {
          logger.warn('Structured output validation failed:', validated.error.message);
        }
      } catch (error) {
        logger.warn(`Failed to parse structured output JSON: ${error}`);
      }
    }

    return result;
  }

  isSuccess(parsed: ParsedOutput): boolean {
    if (parsed.structured) {
      return parsed.structured.status === 'success';
    }
    // If no structured output, assume failure
    return false;
  }

  isComplete(parsed: ParsedOutput): boolean {
    if (parsed.structured) {
      return parsed.structured.nextAction === 'complete';
    }
    return false;
  }

  isBlocked(parsed: ParsedOutput): boolean {
    if (parsed.structured) {
      return parsed.structured.nextAction === 'blocked';
    }
    return false;
  }

  getStoryId(parsed: ParsedOutput): string | null {
    return parsed.structured?.storyId ?? null;
  }

  getError(parsed: ParsedOutput): string | null {
    if (parsed.structured?.error) {
      return parsed.structured.error;
    }
    if (parsed.structured?.status === 'failure') {
      return 'AI reported failure without specific error';
    }
    if (!parsed.structured) {
      return 'No structured output received from AI';
    }
    return null;
  }

  getLearnings(parsed: ParsedOutput): string[] {
    return parsed.structured?.learnings ?? [];
  }

  getFilesChanged(parsed: ParsedOutput): string[] {
    return parsed.structured?.filesChanged ?? [];
  }
}

export const outputParser = new OutputParser();
