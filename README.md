# Gushter

Autonomous AI agent loop that runs Claude Code repeatedly until all PRD items are complete.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## How It Works

Gushter spawns Claude Code in a loop, with each iteration:
1. Reading the PRD (`prd.json`) to find the next incomplete story
2. Implementing that story
3. Running verification (typecheck, lint, test)
4. Committing changes and marking the story complete
5. Repeating until all stories pass or max iterations reached

Each iteration starts fresh with no memory. State persists via:
- Git history (code changes)
- `prd.json` (story completion status)
- `progress.txt` (learnings for future iterations)
- `.gushter/state.json` (iteration tracking, rollback support)

## Installation

```bash
npm install -g gushter
# or use npx
npx gushter <command>
```

**Prerequisite:** [Claude Code CLI](https://claude.ai/code) must be installed and authenticated.

## Quick Start

```bash
# In your project directory
npx gushter init          # Creates prd.json, CLAUDE.md, gushter.config.json

# Edit prd.json with your user stories
# Customize CLAUDE.md for your project

npx gushter run           # Start the agent loop
```

### Using PRD Generation (Recommended)

Instead of manually writing `prd.json`, use the interactive PRD workflow:

```bash
npx gushter prd           # Interactive PRD creation with Claude
npx gushter prd-convert   # Convert prd.md to prd.json
npx gushter run           # Start the agent loop
```

## Commands

### PRD Workflow

```bash
gushter prd               # Create PRD interactively with Claude
gushter prd -o spec.md    # Custom output file
gushter prd-convert       # Convert prd.md to prd.json
gushter prd-convert -i spec.md -o spec.json  # Custom input/output
```

### Agent Loop

```bash
gushter init              # Initialize gushter in current directory
gushter run               # Run the agent loop
gushter run --dry-run     # Simulate without making changes
gushter run -n 20         # Set max iterations (default: 10)
gushter run -s US-001     # Run specific story only
gushter status            # Show current state
gushter status -v         # Verbose status with details
gushter rollback US-001   # Rollback specific story
gushter rollback --all    # Rollback entire run
```

## PRD Workflow

Gushter provides an interactive workflow for creating Product Requirements Documents.

### Step 1: Create PRD

```bash
gushter prd
```

Claude will:
1. Ask you to describe your feature
2. Ask 3-5 clarifying questions with multiple choice options
3. Generate a structured PRD markdown with user stories, acceptance criteria, and technical considerations
4. Save to `prd.md`

### Step 2: Convert to JSON

```bash
gushter prd-convert
```

Claude will:
1. Read `prd.md`
2. Extract and right-size user stories (each must fit in one iteration)
3. Order by dependencies (schema → backend → UI)
4. Generate `prd.json` with proper priorities and acceptance criteria

### Step 3: Run Agent

```bash
gushter run
```

The agent loop reads `prd.json` and implements each story autonomously.

## Configuration

### prd.json

```json
{
  "project": "MyProject",
  "branchName": "gushter/feature-name",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a user, I want X so that Y.",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### gushter.config.json

```json
{
  "maxIterations": 10,
  "maxRetriesPerStory": 3,
  "verification": {
    "commands": [
      { "name": "typecheck", "command": "npm run typecheck" },
      { "name": "lint", "command": "npm run lint" },
      { "name": "test", "command": "npm test" }
    ]
  }
}
```

### CLAUDE.md

Agent instructions that Claude Code follows. The `init` command creates a template. Customize it for your project's patterns and conventions.

## Key Concepts

### One Story Per Iteration
Each Claude instance works on exactly one story. This keeps context focused and changes atomic.

### Fresh Context
No memory between iterations. Learnings persist in `progress.txt`, which Claude reads at the start of each iteration.

### Small Stories
Each story must be completable in one context window. If a task is too big, split it.

Right-sized:
- Add a database column and migration
- Add a UI component to an existing page
- Add a filter dropdown to a list

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"

### Priority Order
Stories execute by priority (lower numbers first). Earlier stories should not depend on later ones.

### Automatic Rollback
Failed iterations rollback to the starting SHA. After max retries, the story is marked as blocked.

### Structured Output
Claude outputs JSON at the end of each response for reliable parsing:

```json
{
  "status": "success",
  "storyId": "US-001",
  "filesChanged": ["src/file.ts"],
  "learnings": ["Pattern discovered"],
  "error": null,
  "nextAction": "continue"
}
```

## State Management

Gushter tracks state in `.gushter/state.json`:
- Current iteration count
- Story completion status
- SHA tracking for rollback
- Blocked stories after max retries

Use `gushter status` to inspect and `gushter rollback` to recover from failures.

## Debugging

```bash
gushter status -v                    # Detailed state
cat prd.json | jq '.userStories'     # Story status
cat progress.txt                     # Learnings from iterations
git log --oneline -10                # Recent commits
```

## License

MIT
