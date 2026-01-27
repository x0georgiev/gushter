# Gushter

*Makes lizard noises while autonomously coding your features.* 🦎

An autonomous AI agent loop that runs Claude Code repeatedly until all your PRD items are complete. Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Installation

```bash
npm install -g gushter
```

Requires [Claude Code CLI](https://claude.ai/code) to be installed and authenticated.

## Quick Start

### Interactive (recommended)

```bash
gushter init --no-prd   # Create config files
gushter prd             # Create PRD interactively with Claude
gushter prd-convert     # Convert to prd.json
gushter run             # Let the lizard loose
```

### Manual

```bash
gushter init            # Create config files + template prd.json
# Edit prd.json with your user stories
gushter run
```

That's it. Gushter will loop through each user story, implement it, run your verification commands, commit, and move to the next one.

## Commands

### `gushter init`

Creates starter files in your project.

| Flag | Description |
|------|-------------|
| `--no-prd` | Skip creating template prd.json |
| `-f, --force` | Overwrite existing files |

### `gushter prd`

Interactive PRD creation with Claude. Asks clarifying questions, generates `prd.md`.

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output file (default: `prd.md`) |
| `-f, --force` | Overwrite existing file |

### `gushter prd-convert`

Converts `prd.md` to `prd.json` with properly sized user stories.

| Flag | Description |
|------|-------------|
| `-i, --input <file>` | Input file (default: `prd.md`) |
| `-o, --output <file>` | Output file (default: `prd.json`) |
| `-f, --force` | Overwrite existing file |

### `gushter run`

Runs the agent loop.

| Flag | Description |
|------|-------------|
| `-n, --max-iterations <n>` | Max iterations (default: 10) |
| `-s, --story <id>` | Run specific story only |
| `-r, --resume` | Resume from saved state |
| `--dry-run` | Simulate without changes |
| `--no-dashboard` | Disable terminal UI |
| `-v, --verbose` | Verbose output |

### `gushter status`

Shows current progress.

| Flag | Description |
|------|-------------|
| `-v, --verbose` | Show detailed information |

### `gushter rollback`

Reverts changes.

| Flag | Description |
|------|-------------|
| `[storyId]` | Rollback specific story |
| `-a, --all` | Rollback all iterations |
| `-f, --force` | Skip confirmation |

## License

MIT
