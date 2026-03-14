# AGENTS.md - Arrowhead Obsidian Plugin

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

Arrowhead is an Obsidian plugin that converts your vault to a complete static website with customizable themes and export options. It's written in TypeScript and uses Vitest for testing.

---

## Build, Lint, and Test Commands

### Development
```bash
npm run dev          # Development build with esbuild (watch mode)
```

### Production
```bash
npm run build        # TypeScript typecheck + production build
npm run release      # Build + create release.zip
```

### Linting & Type Checking
```bash
npm run lint         # ESLint on src/**/*.{ts,mts,js}
npm run typecheck    # TypeScript type checking (tsc --noEmit)
```

### Testing

**Run all tests:**
```bash
npm run test         # Unit tests (vitest run)
```

**Run integration tests only:**
```bash
npm run test:integration
```

**Run a single test file:**
```bash
npx vitest run src/generators/site-generator.test.ts
```

**Run a single test by name:**
```bash
npx vitest run --testNamePattern "should process wikilinks"
```

**Other test commands:**
```bash
npm run test:ui           # Vitest UI for interactive testing
npm run test:quiet        # Run tests with minimal output
npm run test:integration:quiet
```

---

## Code Style Guidelines

### TypeScript Configuration

The project uses strict TypeScript settings (see `tsconfig.json`):
- `noImplicitAny: true`
- `noImplicitReturns: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`

Always provide explicit types. Avoid `any` unless absolutely necessary (e.g., when mocking Obsidian API).

### Imports

**External imports:**
```typescript
import { Notice, Plugin, FileSystemAdapter } from "obsidian";
```

**Internal imports (use relative paths):**
```typescript
import { ArrowheadSettingTab } from "./settings/settings-tab";
import { SiteGenerator } from "./generators/site-generator";
```

### Naming Conventions

- **Classes/Interfaces/Types**: PascalCase (e.g., `SiteGenerator`, `ArrowheadSettings`)
- **Functions/Variables**: camelCase (e.g., `generateSite`, `outputPath`)
- **Constants**: PascalCase for exported constants, SCREAMING_SNAKE for internal (e.g., `DEFAULT_SETTINGS`)
- **File names**: kebab-case for utilities, PascalCase for classes (e.g., `path-utils.ts`, `site-generator.ts`)

### Error Handling

- Use `try-catch` blocks for async operations that may fail
- Display user-facing errors via `new Notice(message)`
- Use `console.error` for debugging logs with context:
  ```typescript
  console.error("[FunctionName] Error context:", error);
  ```
- Always extract error messages safely:
  ```typescript
  const errorMessage = error instanceof Error ? error.message : String(error);
  ```

### ESLint Rules

The project uses ESLint with typescript-eslint and eslint-plugin-obsidianmd. Key rules:
- All recommended + strict rules from typescript-eslint
- Obsidian-specific rules (settings-tab, commands, vault, etc.)
- `no-unused-vars` is off (rely on TypeScript)
- `any` type rules are relaxed for Obsidian API compatibility

### Code Structure

- **Main entry**: `src/main.ts` - ArrowheadPlugin class
- **Settings**: `src/settings/settings.ts`, `src/settings/settings-tab.ts`
- **Generators**: `src/generators/site-generator.ts`
- **Exporters**: `src/exporters/file-exporter.ts`
- **Utilities**: `src/utils/*.ts`
- **Types**: `src/types.ts` for shared interfaces

### Testing Conventions

- Unit tests: `*.test.ts` in `src/`
- Integration tests: `*.integration.test.ts` in `src/`
- Use Vitest with globals enabled
- Mock modules with `vi.mock()`:
  ```typescript
  vi.mock('fs');
  vi.mock('path');
  ```
- Use `any` type assertion for mock plugin objects in tests

---

## Development Workflow

### Commit After Each Task

Create a commit after completing each implementation task:
```bash
git add -A && git commit -m "description of changes"
```

Follow existing commit message style (concise, action-oriented).

### Pre-Push Checks

Before pushing, always run:
```bash
npm run lint && npm run typecheck && npm run test
```

If tests fail or linting errors exist, fix them before pushing.

### Release Process

```bash
npm run version           # Bump version in manifest.json and versions.json
npm run release:prepare   # Prepare release
npm run release:commit    # Create release commit
npm run release          # Build and create release.zip
npm run deploy           # Deploy to server
```

---

## Additional Notes

- The plugin targets ES6+ with ESNext modules
- Uses esbuild for bundling
- Template files are in `templates/` directory
- Test data is in `test-data/` directory
- The Obsidian API is accessed through the `obsidian` npm package
