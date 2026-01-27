import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { DEFAULT_CONFIG } from '../../config/schema.js';

export interface InitOptions {
  force?: boolean;
}

const EXAMPLE_CONFIG = {
  ...DEFAULT_CONFIG,
  verification: {
    commands: [
      { name: 'typecheck', command: 'npm run typecheck' },
      { name: 'lint', command: 'npm run lint' },
      { name: 'test', command: 'npm test' },
    ],
  },
};

const CLAUDE_MD_TEMPLATE = `# Gushter Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at \`prd.json\`
2. Read the progress log at \`progress.txt\` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD \`branchName\`. If not, check it out or create from main.
4. Pick the **highest priority** user story where \`passes: false\`
5. Implement that single user story
6. Run quality checks (typecheck, lint, test)
7. If checks pass, commit ALL changes with message: \`feat: [Story ID] - [Story Title]\`
8. Update the PRD to set \`passes: true\` for the completed story
9. Append your progress to \`progress.txt\`

## Progress Report Format

APPEND to progress.txt (never replace):
\`\`\`
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
\`\`\`

## Codebase Patterns

If you discover a **reusable pattern**, add it to the \`## Codebase Patterns\` section at the TOP of progress.txt:

\`\`\`
## Codebase Patterns
- Pattern 1
- Pattern 2
\`\`\`

## Quality Requirements

- ALL commits must pass quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Structured Output (Required)

At the END of your response, output this JSON block:

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

**Fields:**
- \`status\`: \`"success"\` or \`"failure"\`
- \`storyId\`: The story ID you worked on
- \`filesChanged\`: Files you modified
- \`learnings\`: Insights for future iterations
- \`error\`: Error message if failed, otherwise \`null\`
- \`nextAction\`:
  - \`"continue"\` - More stories remain
  - \`"complete"\` - ALL stories are done
  - \`"blocked"\` - Cannot proceed

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read Codebase Patterns in progress.txt before starting
`;

const PRD_TEMPLATE = {
  project: "MyProject",
  branchName: "gushter/feature-name",
  description: "Brief description of the feature",
  userStories: [
    {
      id: "US-001",
      title: "First user story",
      description: "As a user, I want X so that Y.",
      acceptanceCriteria: [
        "Criterion 1",
        "Criterion 2",
        "Typecheck passes"
      ],
      priority: 1,
      passes: false,
      notes: ""
    }
  ]
};

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const configPath = resolve(cwd, 'gushter.config.json');
  const claudeMdPath = resolve(cwd, 'CLAUDE.md');
  const prdPath = resolve(cwd, 'prd.json');

  const filesToCreate: Array<{ path: string; content: string; name: string }> = [];

  // Check what needs to be created
  if (!existsSync(configPath) || options.force) {
    filesToCreate.push({
      path: configPath,
      content: JSON.stringify(EXAMPLE_CONFIG, null, 2) + '\n',
      name: 'gushter.config.json',
    });
  }

  if (!existsSync(claudeMdPath) || options.force) {
    filesToCreate.push({
      path: claudeMdPath,
      content: CLAUDE_MD_TEMPLATE,
      name: 'CLAUDE.md',
    });
  }

  if (!existsSync(prdPath) || options.force) {
    filesToCreate.push({
      path: prdPath,
      content: JSON.stringify(PRD_TEMPLATE, null, 2) + '\n',
      name: 'prd.json',
    });
  }

  if (filesToCreate.length === 0) {
    logger.warn('All files already exist. Use --force to overwrite.');
    return;
  }

  // Check for existing files without force
  const existingFiles = filesToCreate
    .map((f) => f.name)
    .filter((name) => existsSync(resolve(cwd, name)));

  if (existingFiles.length > 0 && !options.force) {
    logger.warn(`Some files already exist: ${existingFiles.join(', ')}`);
    logger.info('Use --force to overwrite existing files');
  }

  try {
    for (const file of filesToCreate) {
      if (!existsSync(file.path) || options.force) {
        writeFileSync(file.path, file.content);
        logger.success(`Created ${chalk.cyan(file.name)}`);
      }
    }

    logger.newline();
    logger.info('Next steps:');
    logger.raw('  1. Edit prd.json with your user stories');
    logger.raw('  2. Customize CLAUDE.md for your project');
    logger.raw('  3. Adjust gushter.config.json verification commands');
    logger.raw('  4. Run: npx gushter run');
  } catch (error) {
    logger.error(`Failed to create files: ${error}`);
    process.exit(1);
  }
}
