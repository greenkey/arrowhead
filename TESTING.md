# Integration Testing Guide

This document provides comprehensive guidance for the Arrowhead Obsidian Plugin integration test suite.

## Overview

The integration test suite validates the complete publishing pipeline, from vault file processing to static site generation. Tests cover:

- **Publishing Validation**: File creation, content accuracy, nested structures
- **Output Organization**: Folder structure, URL generation, asset handling
- **Formatting Conversion**: Markdown formatting (bold, italic, headers, lists)
- **Settings Impact**: Configuration toggles affecting generation
- **File Operations**: Create, read, rename, delete operations
- **Vault Management**: Test infrastructure setup and cleanup

## Running Tests

### Unit Tests

```bash
npm run test              # Run all unit tests
npm run test:ui           # Run with Vitest UI
npm run test:quiet        # Run silently without console output
```

### Integration Tests

```bash
npm run test:integration              # Run all integration tests
npm run test:integration:quiet        # Run silently
npm run test:all                      # Run both unit and integration tests
```

### All Tests with Linting

```bash
npm run lint
npm run typecheck
npm run test:all
```

## Test Infrastructure

### Test Vault Structure

```
test-data/
├── vault/
│   ├── posts/
│   │   ├── getting-started-ssg.md
│   │   ├── optimizing-performance.md
│   │   └── nested/
│   │       └── advanced-markdown.md
│   ├── pages/
│   │   ├── about.md
│   │   ├── contact.md
│   │   └── nested/
│   │       └── services.md
│   └── assets/
│       └── sample-image.png
└── output/
    ├── pages/
    ├── posts/
    └── assets/
```

### Test Helpers

#### TestVaultManager

Manages temporary test vault creation and cleanup:

```typescript
import { TestVaultManager } from './src/test-helpers';

const vaultManager = new TestVaultManager({
  vaultPath: '/tmp/test-vault',
  outputPath: '/tmp/test-output'
});

await vaultManager.setup();

// Create files
await vaultManager.createFile('pages/test.md', content);
await vaultManager.createFiles([{ path: 'pages/a.md', content }]);

// Read content
const content = await vaultManager.getFileContent('pages/test.md');
const exists = await vaultManager.fileExists('pages/test.md');

// Get paths
const vaultPath = vaultManager.getVaultPath();
const outputPath = vaultManager.getOutputPath();

// Cleanup
await vaultManager.cleanup();
```

#### OutputVerifier

Validates generated output:

```typescript
import { OutputVerifier } from './src/test-helpers';

const verifier = new OutputVerifier('/tmp/test-output');

// Check files
const exists = await verifier.fileExists('pages/about.html');
const content = await verifier.readFile('pages/about.html');
const contains = await verifier.containsText('pages/about.html', 'Welcome');

// Count files
const htmlCount = await verifier.countFilesByExtension('.html');
const htmlFiles = await verifier.listHtmlFiles();
```

#### Mock Plugin Factory

Create mock plugin instances for settings testing:

```typescript
import { createMockPlugin, createMockSettings } from './src/test-helpers';

const mockPlugin = createMockPlugin({
  generateRobotsTxt: false,
  siteTitle: 'Custom Title'
});

const settings = mockPlugin.settings;
```

## Writing New Tests

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager } from './test-helpers';

describe('Feature Area Tests', () => {
  let vaultManager: TestVaultManager;

  beforeEach(async () => {
    const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
    vaultManager = new TestVaultManager({
      vaultPath: path.join(tmpDir, 'vault'),
      outputPath: path.join(tmpDir, 'output')
    });
    await vaultManager.setup();
  });

  afterEach(async () => {
    await vaultManager.cleanup();
  });

  it('should perform expected behavior', async () => {
    await vaultManager.createFile('pages/test.md', '# Test');
    const exists = await vaultManager.fileExists('pages/test.md');
    expect(exists).toBe(true);
  });
});
```

### Test Data Patterns

#### Frontmatter Patterns

```typescript
const pageFrontmatter = `---
title: Page Title
date: 2026-03-10
description: Optional description
tags: [tag1, tag2]
---`;

const postFrontmatter = `---
title: Post Title
date: 2026-03-10T10:00:00Z
tags: [tag1, tag2]
---`;
```

#### Markdown Content Patterns

```typescript
const headers = `# H1\n## H2\n### H3`;
const formatting = '**bold**, *italic*, ***bold italic***';
const lists = '- Item 1\n- Item 2\n  - Nested';
```

## CI/CD Pipeline

The GitHub Actions workflow runs:

1. **Lint & TypeCheck** - ESLint and TypeScript type checking
2. **Unit Tests** - Fast unit tests with Vitest
3. **Integration Tests** - Full pipeline integration tests
4. **Build** - TypeScript compilation and esbuild
5. **Release** - Automated release on version tags

### Triggering Releases

```bash
npm version patch|minor|major
git push && git push --tags
```

This triggers the release job which builds and uploads the plugin.

## Test Configuration

### vitest.config.ts

Default configuration for unit tests.

### vitest.integration.config.ts

Integration test configuration with:
- Longer timeout (30s)
- Parallel execution disabled
- Separate output directory

### package.json Scripts

| Script | Purpose |
|--------|---------|
| `test` | Run unit tests |
| `test:ui` | Run with UI |
| `test:quiet` | Silent unit tests |
| `test:integration` | Run integration tests |
| `test:integration:quiet` | Silent integration tests |
| `test:all` | Run all tests |
| `lint` | Run ESLint |
| `typecheck` | TypeScript checking |

## Excluded Directories

The following directories are excluded from npm package:

- `test-data/` - Test vault and fixtures
- `test-results/` - Test output artifacts
- `src/test/` - Test utilities and mocks
- `vitest*.config.ts` - Test configurations

## Best Practices

1. **Use unique temp directories** - Each test should use `fs.mkdtempSync()`
2. **Clean up resources** - Always call cleanup in `afterEach`
3. **Test single behavior** - One assertion per test when possible
4. **Use descriptive names** - Test names should describe what they verify
5. **Avoid external dependencies** - Tests should be self-contained

## Troubleshooting

### Tests timeout

Increase timeout in test configuration or split into smaller tests.

### Cleanup failures

Ensure files are tracked in `createdFiles` array.

### Mock issues

Use `vi.fn()` for mock functions and reset mocks between tests.

### Missing directories

Ensure `setup()` creates all required directories.