# Gushter Development

This file provides guidance for developing Gushter itself.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run in development mode
npm run build        # Compile TypeScript
npm run typecheck    # Type checking
npm run lint         # Linting
npm run test         # Run tests
```

## Architecture

```
src/
├── index.ts              # CLI entry point
├── cli/commands/         # CLI command handlers
├── core/                 # Core logic
│   ├── orchestrator.ts   # Main loop
│   ├── state-machine.ts  # State management
│   ├── story-picker.ts   # Story selection
│   ├── git-manager.ts    # Git operations
│   ├── ai-runner.ts      # Claude Code spawning
│   └── output-parser.ts  # JSON output parsing
├── verification/         # Quality checks
├── config/               # Configuration
├── types/                # Type definitions
└── utils/                # Utilities
```

## Key Files

- `src/core/orchestrator.ts` - Main agent loop logic
- `src/core/output-parser.ts` - Parses `json:gushter-output` blocks
- `src/cli/commands/init.ts` - Contains templates for user projects
- `templates/` - Reference templates (also embedded in init.ts)

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```
