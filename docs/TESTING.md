# Testing Guide

## Testing Philosophy

- Tests validate the complete publishing pipeline
- Tests use real vault structures for accuracy
- All tests must pass before merging

## Test Structure

### Unit Tests
- Test individual components in isolation
- Located alongside source files (e.g., `template-engine.test.ts`)
- Fast, focused tests

### Integration Tests
- Test the full generation pipeline
- 14 integration test files covering different features
- Located in `src/*.integration.test.ts`
- Use real file system operations

## Running Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test

# Integration tests only
npm run test:integration

# Tests with UI
npm run test:ui

# Silent mode
npm run test:quiet
npm run test:integration:quiet
```

## Test Coverage Areas

### Publishing Tests
- File creation and content accuracy
- Nested folder structures
- Frontmatter handling
- Special characters in filenames

### Settings Tests
- Configuration options validation
- Default settings verification
- Settings override behavior

### Formatting Tests
- Bold, italic, bold-italic formatting
- Headers H1-H3
- Bullet lists with nesting
- Combined formatting

### Output Organization Tests
- Folder structure generation
- URL generation
- Asset folder handling
- Content separation (pages vs posts)

### File Operations Tests
- Create, read, rename, delete
- Batch file operations
- Path handling
- Unicode characters

### Vault Walker Tests
- File classification (page/post/asset)
- Frontmatter extraction
- Tag extraction (frontmatter and inline)
- Wikilink and embed parsing
- Link resolution

### Preview Server Tests
- Server start/stop lifecycle
- File serving with correct MIME types
- Error handling (404 responses)
- Port management

### File Exporter Tests
- Path validation
- Output path resolution
- Integration with site generator

## Test Data

The `test-data/` directory contains a sample vault structure used by integration tests:

```
test-data/
├── vault/
│   ├── posts/
│   ├── pages/
│   └── assets/
└── output/
```

This ensures consistent testing across all environments.

## Writing New Tests

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager } from './test-helpers';

describe('Feature Area Tests', () => {
  let vaultManager: TestVaultManager;

  beforeEach(async () => {
    vaultManager = new TestVaultManager({
      vaultPath: '/tmp/test-vault',
      outputPath: '/tmp/test-output'
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

## Test Helpers

### TestVaultManager
Manages temporary test vault creation and cleanup:

```typescript
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

### OutputVerifier
Validates generated output:

```typescript
const verifier = new OutputVerifier('/tmp/test-output');

// Check files
const exists = await verifier.fileExists('pages/about.html');
const content = await verifier.readFile('pages/about.html');
const contains = await verifier.containsText('pages/about.html', 'Welcome');
```

## CI/CD Pipeline

Tests run automatically on:
- Every pull request
- Every push to main branch
- Before releases

## Best Practices

1. **Use unique temp directories** - Each test uses `fs.mkdtempSync()`
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