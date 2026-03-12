# Contributing Guide

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/arrowhead-obsidian-plugin.git
cd arrowhead-obsidian-plugin

# Install dependencies
npm install

# Start development (watches for changes)
npm run dev

# Build for production
npm run build
```

## Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development build with file watching |
| `npm run build` | Production build (TypeScript check + esbuild) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:all` | Run all tests |

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make changes to source files
3. Run tests: `npm run test`
4. Fix any linting or type errors
5. Commit at each completed step
6. Push and create pull request

### Code Style

- TypeScript with strict mode enabled
- ESLint configuration enforces code style
- 2-space indentation
- Descriptive variable names
- Comments for complex logic

### Testing Strategy

1. **Write tests first** (TDD when appropriate)
2. **Run tests** before committing
3. **All tests must pass** before merging
4. **Integration tests** validate full pipeline

See [TESTING.md](TESTING.md) for details.

## Project Structure

```
arrowhead-obsidian-plugin/
├── src/                    ← Source code
│   ├── main.ts            ← Plugin entry
│   ├── settings/          ← Configuration
│   ├── generators/        ← Generation logic
│   ├── exporters/         ← File operations
│   ├── utils/             ← Utilities
│   └── ui/                ← UI components
├── test-data/             ← Test vault structure
├── docs/                  ← Documentation
├── esbuild.config.mjs     ← Build configuration
├── tsconfig.json          ← TypeScript config
└── vitest.config.ts       ← Test configuration
```

## Building the Plugin

```bash
# Development build (faster)
npm run dev

# Production build
npm run build

# Release build (includes zip)
npm run release
```

## Testing

```bash
# All tests
npm run test:all

# Unit tests only
npm run test

# Integration tests only
npm run test:integration

# Tests with UI
npm run test:ui
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Run lint and typecheck
6. Submit pull request

## Bug Reports

When reporting bugs, include:
- Obsidian version
- Plugin version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors if any

## Questions

- Check existing issues first
- Open a new issue for questions
- Tag appropriately