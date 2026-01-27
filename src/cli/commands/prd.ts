import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';

export interface PrdOptions {
  output?: string;
  force?: boolean;
}

const PRD_SKILL_PROMPT = `# PRD Generator Skill

You are a Product Requirements Document (PRD) generator. Your goal is to create a clear, actionable PRD that can be converted to user stories for autonomous code generation.

## Workflow

### Step 1: Gather Context

First, ask the user to describe their feature. Then ask 3-5 clarifying questions with lettered options (A, B, C, D) to fully understand:
- The problem being solved
- Target users
- Core functionality scope
- Success criteria
- Any constraints

Format questions like:
\`\`\`
1. What is the primary goal of this feature?
   A) [Option A]
   B) [Option B]
   C) [Option C]
   D) Other (please specify)

2. Who is the target user?
   A) [Option A]
   B) [Option B]
   C) [Option C]
   D) Other (please specify)
\`\`\`

Allow the user to respond concisely (e.g., "1A, 2C, 3B").

### Step 2: Generate PRD

After gathering context, create a markdown PRD with these sections:

# [Feature Name] PRD

## Overview
Brief description of the feature and its purpose.

## Goals
- Measurable objective 1
- Measurable objective 2

## User Stories
Break down into small, implementable stories. Each story should be completable in ONE iteration (one context window). Format:

### US-001: [Title]
**As a** [user type], **I want** [functionality] **so that** [benefit].

**Acceptance Criteria:**
- [ ] Specific, verifiable criterion
- [ ] Another criterion
- [ ] Typecheck passes

### US-002: [Title]
...

## Functional Requirements
1. Explicit capability requirement
2. Another requirement

## Non-Goals
- What is explicitly OUT of scope

## Technical Considerations
- Any constraints or dependencies
- Architecture notes

## Design Considerations (if applicable)
- UI/UX requirements

## Open Questions
- Any remaining clarifications needed

## Story Sizing Guidelines

**Right-sized stories (ONE iteration):**
- Add a database column
- Create a UI component
- Implement a single endpoint
- Add form validation

**Oversized stories (need splitting):**
- "Build the entire dashboard" → Split into individual widgets
- "Add authentication" → Split into login, signup, session management
- "Refactor the API" → Split into specific endpoints

### Step 3: Save the PRD

Save the PRD to the specified output file (default: \`prd.md\`).

## Key Principles

1. **Verifiable Acceptance Criteria**: Not "works correctly" but "shows confirmation dialog before deleting"
2. **Small Stories**: Each story completable in one context window
3. **Dependency Order**: Schema → Backend → UI → Integration
4. **Always Include**: "Typecheck passes" in acceptance criteria

## Begin

Start by asking the user what feature they want to build. Be conversational and helpful.
`;

export async function prdCommand(options: PrdOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const outputPath = resolve(cwd, options.output ?? 'prd.md');

  // Check if output already exists
  if (existsSync(outputPath) && !options.force) {
    logger.error(`${options.output ?? 'prd.md'} already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  logger.info('Starting PRD generation with Claude Code...');
  logger.info(`Output will be saved to: ${chalk.cyan(outputPath)}`);
  logger.newline();
  logger.info('Claude will ask clarifying questions to understand your feature.');
  logger.info('Press Ctrl+C to cancel at any time.');
  logger.newline();

  try {
    await runInteractiveClaude(PRD_SKILL_PROMPT, cwd, outputPath);

    if (existsSync(outputPath)) {
      logger.newline();
      logger.success(`PRD created: ${chalk.cyan(outputPath)}`);
      logger.newline();
      logger.info('Next steps:');
      logger.raw('  1. Review the generated PRD');
      logger.raw('  2. Run: gushter prd-convert to generate prd.json');
    }
  } catch (error) {
    logger.error(`PRD generation failed: ${error}`);
    process.exit(1);
  }
}

async function runInteractiveClaude(systemPrompt: string, cwd: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fullSystemPrompt = `${systemPrompt}

IMPORTANT: When the PRD is complete, save it to: ${outputPath}`;

    // Use --system-prompt for instructions, pass initial message as argument
    // No -p flag = interactive mode
    const child = spawn('claude', [
      '--system-prompt', fullSystemPrompt,
      'Start by asking the user what feature they want to build.'
    ], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn claude: ${error.message}`));
    });
  });
}
