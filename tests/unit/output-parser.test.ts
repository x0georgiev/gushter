import { describe, it, expect } from 'vitest';
import { OutputParser } from '../../src/core/output-parser.js';

describe('OutputParser', () => {
  const parser = new OutputParser();

  describe('parse', () => {
    it('should parse structured JSON output', () => {
      const output = `
Some other output here

\`\`\`json:gushter-output
{
  "status": "success",
  "storyId": "US-001",
  "filesChanged": ["src/file.ts"],
  "learnings": ["Pattern discovered"],
  "error": null,
  "nextAction": "continue"
}
\`\`\`

More output after
`;

      const result = parser.parse(output);

      expect(result.structured).not.toBeNull();
      expect(result.structured?.status).toBe('success');
      expect(result.structured?.storyId).toBe('US-001');
      expect(result.structured?.filesChanged).toEqual(['src/file.ts']);
      expect(result.structured?.learnings).toEqual(['Pattern discovered']);
      expect(result.structured?.nextAction).toBe('continue');
    });

    it('should handle missing structured output', () => {
      const output = 'Just some regular output without any structured data';

      const result = parser.parse(output);

      expect(result.structured).toBeNull();
      expect(result.rawOutput).toBe(output);
    });

    it('should handle invalid JSON gracefully', () => {
      const output = `
\`\`\`json:gushter-output
{ invalid json here
\`\`\`
`;

      const result = parser.parse(output);

      expect(result.structured).toBeNull();
    });
  });

  describe('isSuccess', () => {
    it('should return true for success status', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "success", "storyId": "US-001", "nextAction": "continue"}
\`\`\`
`);

      expect(parser.isSuccess(result)).toBe(true);
    });

    it('should return false for failure status', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "failure", "storyId": "US-001", "nextAction": "continue"}
\`\`\`
`);

      expect(parser.isSuccess(result)).toBe(false);
    });

    it('should return false when no structured output', () => {
      const result = parser.parse('no structured output');

      expect(parser.isSuccess(result)).toBe(false);
    });
  });

  describe('isComplete', () => {
    it('should return true for complete nextAction', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "success", "storyId": "US-001", "nextAction": "complete"}
\`\`\`
`);

      expect(parser.isComplete(result)).toBe(true);
    });

    it('should return false for continue nextAction', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "success", "storyId": "US-001", "nextAction": "continue"}
\`\`\`
`);

      expect(parser.isComplete(result)).toBe(false);
    });

    it('should return false when no structured output', () => {
      const result = parser.parse('no structured output');

      expect(parser.isComplete(result)).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('should return true for blocked nextAction', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "failure", "storyId": "US-001", "nextAction": "blocked"}
\`\`\`
`);

      expect(parser.isBlocked(result)).toBe(true);
    });

    it('should return false without structured output', () => {
      const result = parser.parse('some output');

      expect(parser.isBlocked(result)).toBe(false);
    });
  });

  describe('getError', () => {
    it('should return error from structured output', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "failure", "storyId": "US-001", "error": "Something went wrong", "nextAction": "continue"}
\`\`\`
`);

      expect(parser.getError(result)).toBe('Something went wrong');
    });

    it('should return generic error for failure without error field', () => {
      const result = parser.parse(`
\`\`\`json:gushter-output
{"status": "failure", "storyId": "US-001", "nextAction": "continue"}
\`\`\`
`);

      expect(parser.getError(result)).toBe('AI reported failure without specific error');
    });

    it('should return error when no structured output', () => {
      const result = parser.parse('no structured output');

      expect(parser.getError(result)).toBe('No structured output received from AI');
    });
  });
});
