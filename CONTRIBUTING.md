# Contributing Guide

> **IMPORTANT:** This project uses **Codeberg** as its primary development platform.
> GitHub is only a read-only mirror. All contributions, issues, and development
> must happen on Codeberg.

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- Git
- Codeberg account (for contributions)

### Initial Setup

```bash
# Clone the repository
git clone https://codeberg.org/greenkey/arrowhead.git
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
| `npm run release:prepare` | Prepare a release (bump version, show changelog suggestions) |
| `npm run release:commit` | Commit and push prepared release |

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make changes to source files
3. Run tests: `npm run test`
4. Fix any linting or type errors
5. Commit at each completed step
6. Push and create pull request to master

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
├── scripts/               ← Build and release scripts
├── .forgejo/workflows/    ← Forgejo CI/CD
├── .github/workflows/     ← GitHub CI/CD (mirrored)
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

## Running CI/CD Locally

The project uses Forgejo and GitHub Actions for CI/CD. You can run the full workflow locally using [act](https://github.com/nektos/act):

```bash
# Run all CI jobs locally
./scripts/run-act.sh

# Run specific jobs
./scripts/run-act.sh -j lint-and-typecheck
./scripts/run-act.sh -j unit-tests
./scripts/run-act.sh -j build
```

The script:
1. Temporarily converts Forgejo Actions syntax to GitHub Actions format
2. Runs the CI/CD workflow using act
3. Restores the original Forgejo workflow file on exit (even if the script fails)

Note: Requires [act](https://github.com/nektos/act) to be installed (`brew install act` on macOS).

## Submitting Changes

1. Fork the repository on Codeberg
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Run lint and typecheck
6. Submit pull request to master

## Release Process

### Overview

Releases are automated through a two-step process:

1. **Prepare**: Bump version and get changelog suggestions
2. **Commit**: Commit changes and push to trigger CI/CD

Both Codeberg and GitHub releases are created automatically when a tag is pushed.

### Step 1: Prepare the Release

```bash
# Patch release (1.0.4 → 1.0.5)
npm run release:prepare patch

# Minor release (1.0.4 → 1.1.0)
npm run release:prepare minor

# Major release (1.0.4 → 2.0.0)
npm run release:prepare major
```

This will:
- Bump the version in `manifest.json`, `package.json`, and `versions.json`
- Show changelog suggestions based on git history since the last tag
- Display the changes that should be added to `CHANGELOG.md`

### Step 2: Update CHANGELOG.md

Edit `CHANGELOG.md` and add a new section for the release:

```markdown
## [1.1.0] - 2025-03-13

### Added
- Add new feature A
- Add feature B

### Fixed
- Fix bug in XYZ
```

Move the `[Unreleased]` header to your new version section.

### Step 3: Commit and Push

```bash
# With custom message
npm run release:commit "Add social media integration and dark mode"

# Or use default message
npm run release:commit
```

This will:
- Stage the version bump and CHANGELOG changes
- Commit with message: `chore: release version X.Y.Z`
- Push to Codeberg master

### Step 4: CI/CD Creates the Release

After you push:

1. CI/CD runs lint, tests, and build on master
2. If all checks pass, CI/CD automatically creates and pushes the tag `vX.Y.Z`
3. The tag triggers automatic releases on:
   - **Codeberg**: Creates Forgejo release with `release.zip`
   - **GitHub**: Creates GitHub release with `main.js`, `manifest.json`, `styles.css`

### Tag Creation

**Do NOT create tags manually!** Tags are automatically created by CI/CD after:
- All tests pass
- Build completes successfully
- The commit modified `manifest.json` (indicating a version bump)

## Why Codeberg?

This project uses Codeberg as its primary platform because:

- **Privacy-respecting**: No telemetry, no tracking
- **Community-owned**: Not owned by a corporation
- **Open source**: Entire platform is open source
- **Ethical**: No AI training clauses in terms of service

GitHub is automatically updated via Codeberg's push mirroring feature.

## Bug Reports

When reporting bugs, include:
- Obsidian version
- Plugin version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors if any

## Questions

- Check existing issues on Codeberg first
- Open a new issue on Codeberg for questions
- Tag appropriately