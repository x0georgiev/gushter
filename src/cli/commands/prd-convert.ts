import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';

export interface PrdConvertOptions {
  input?: string;
  output?: string;
  force?: boolean;
}

const PRD_CONVERT_SKILL = `# PRD to JSON Converter Skill

You are a PRD converter that transforms markdown PRD documents into structured \`prd.json\` format for Gushter, an autonomous agent system.

## Critical Constraint: Story Sizing

Each story MUST be completable in ONE iteration (one context window). Since Gushter spawns fresh instances without memory between iterations, oversized stories cause context exhaustion and broken code.

**Right-sized stories:**
- Add a database column
- Create a single UI component
- Implement one API endpoint
- Add form validation to a specific form
- Update server logic for one feature

**Oversized stories (split these):**
- "Build the entire dashboard" → Split into individual widgets/sections
- "Add authentication" → Login form, signup form, session management, password reset
- "Refactor the API" → One endpoint at a time
- "Create user management" → List users, view user, edit user, delete user

## Output Format

Generate a \`prd.json\` with this structure:

\`\`\`json
{
  "project": "ProjectName",
  "branchName": "gushter/feature-name-kebab-case",
  "description": "Brief description of the feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a [user], I want [functionality] so that [benefit].",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Another criterion",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
\`\`\`

## Conversion Rules

1. **Sequential IDs**: US-001, US-002, US-003, etc.
2. **Priority by Dependencies**: Lower priority number = higher priority
   - Schema/types changes first (priority 1)
   - Backend/API next (priority 2-3)
   - UI components (priority 4-5)
   - Integration/polish last (priority 6+)
3. **All stories start with**: \`passes: false\` and empty \`notes\`
4. **Branch naming**: \`gushter/feature-name\` in kebab-case
5. **Always include**: "Typecheck passes" in acceptance criteria
6. **UI stories include**: "Verify visually in browser" in acceptance criteria

## Acceptance Criteria Quality

**Good (verifiable):**
- "Button shows confirmation dialog before deleting"
- "Form displays error message when email is invalid"
- "API returns 404 when user not found"
- "Loading spinner appears while fetching data"

**Bad (vague):**
- "Works correctly"
- "Handles errors properly"
- "Good user experience"
- "Performs well"

## Workflow

1. Read the provided PRD markdown
2. Extract project name and feature description
3. Parse user stories, ensuring each is right-sized
4. Order by dependencies (schema → backend → UI)
5. Generate the prd.json
6. Save to the specified output path

## Begin

I will now read the PRD markdown and convert it to prd.json format.
`;

export async function prdConvertCommand(options: PrdConvertOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const inputPath = resolve(cwd, options.input ?? 'prd.md');
  const outputPath = resolve(cwd, options.output ?? 'prd.json');

  // Check if input exists
  if (!existsSync(inputPath)) {
    logger.error(`Input file not found: ${inputPath}`);
    logger.info('Create a PRD first with: gushter prd');
    process.exit(1);
  }

  // Check if output already exists
  if (existsSync(outputPath) && !options.force) {
    logger.error(`${options.output ?? 'prd.json'} already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  // Read the PRD content
  let prdContent: string;
  try {
    prdContent = readFileSync(inputPath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read ${inputPath}: ${error}`);
    process.exit(1);
  }

  logger.info(`Converting ${chalk.cyan(inputPath)} to ${chalk.cyan(outputPath)}...`);
  logger.newline();

  try {
    await runClaudeConvert(prdContent, cwd, outputPath);

    if (existsSync(outputPath)) {
      logger.newline();
      logger.success(`PRD converted: ${chalk.cyan(outputPath)}`);
      logger.newline();
      logger.info('Next steps:');
      logger.raw('  1. Review the generated prd.json');
      logger.raw('  2. Adjust priorities if needed');
      logger.raw('  3. Run: gushter run');
    } else {
      logger.error('Conversion completed but output file was not created.');
      logger.info('Please check Claude output for errors.');
      process.exit(1);
    }
  } catch (error) {
    logger.error(`PRD conversion failed: ${error}`);
    process.exit(1);
  }
}

async function runClaudeConvert(prdContent: string, cwd: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const prompt = `${PRD_CONVERT_SKILL}

## PRD Content to Convert

\`\`\`markdown
${prdContent}
\`\`\`

## Task

Convert the above PRD to prd.json format and save it to: ${outputPath}

Remember:
- Split any oversized stories
- Order by dependencies
- All stories start with passes: false
- Include "Typecheck passes" in all acceptance criteria
- Use kebab-case for branchName`;

    // Use --print and --dangerously-skip-permissions for non-interactive conversion
    const child = spawn('claude', ['--dangerously-skip-permissions', '--print'], {
      cwd,
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env },
    });

    child.stdin?.write(prompt);
    child.stdin?.end();

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
