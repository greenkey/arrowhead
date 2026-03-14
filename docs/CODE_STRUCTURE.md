# Code Structure

## Source Files Overview

```
src/
├── main.ts                    ← Plugin class, commands, lifecycle
├── index.ts                   ← Plugin initialization
├── types.ts                   ← Core type definitions
│
├── settings/
│   ├── settings.ts            ← ArrowheadSettings interface (re-exports from path-utils)
│   └── settings-tab.ts        ← Settings UI component
│
├── generators/
│   └── site-generator.ts      ← Main generation orchestration
│
├── exporters/
│   └── file-exporter.ts       ← File system operations
│
├── utils/
│   ├── vault-walker.ts        ← Vault scanning & classification
│   ├── path-utils.ts          ← Path validation, resolution, URL encoding
│   ├── markdown-processor.ts  ← Unified markdown processing (wikilinks, embeds, syntax)
│   ├── template-engine.ts     ← Template processing
│   └── preview-server.ts      ← HTTP preview server
│
├── ui/
│   └── export-modal.ts        ← Export progress modal
│
├── test/
│   └── mocks.ts               ← Test mock objects
│
└── *.integration.test.ts      ← Integration tests (14 files)
```

## Key Files

### Core Plugin
- `main.ts`: Main plugin class extending Obsidian Plugin. Registers commands, handles settings, triggers generation.

### Configuration
- `settings/settings.ts`: Defines `ArrowheadSettings` interface with all configuration options.
- `settings/settings-tab.ts`: Creates the settings UI tab in Obsidian.

### Processing Pipeline
- `generators/site-generator.ts`: The main orchestrator. Coordinates:
  - Clearing output directory
  - Walking the vault
  - Generating content
  - Exporting files

- `exporters/file-exporter.ts`: Handles file operations:
  - Validates output paths
  - Copies files
  - Manages directory structure

### Utilities
- `utils/vault-walker.ts`: Scans vault structure:
  - Traverses directories
  - Classifies files (page/post/asset)
  - Extracts frontmatter and metadata
  - Finds wikilinks and embeds

- `utils/path-utils.ts`: Consolidated path utilities:
  - `isAbsolutePath()`: Check if path is absolute
  - `validateOutputPath()`: Validate and resolve output paths with security checks
  - `pathToUrl()`: Convert file path to URL-friendly format
  - `getOutputPath()`: Get output file path with .html extension
  - `encodeUrlPath()`: URL-encode path segments
  - `resolveOutputPath()`: Resolve relative paths to absolute
  - `getRelativeOutputPath()`: Get relative path from absolute

- `utils/markdown-processor.ts`: Unified markdown processing:
  - `process()`: Full markdown processing pipeline
  - `processWikiLinks()`: Convert [[wiki links]] to HTML
  - `processMarkdownSyntax()`: Convert markdown to HTML (headers, bold, italic, etc.)
  - `processEmbeds()`: Handle image/file embeds
  - `removeFrontmatter()`: Strip YAML frontmatter from content

- `utils/template-engine.ts`: Template processing for HTML generation.

- `utils/preview-server.ts`: HTTP server for local preview:
  - Serves static files
  - Handles MIME types
  - Manages server lifecycle

## Integration Tests

| Test File | Tests |
|-----------|-------|
| `publishing.integration.test.ts` | File creation, content accuracy, nested structures |
| `settings-impact.integration.test.ts` | Configuration options and defaults |
| `formatting-conversion.integration.test.ts` | Markdown formatting (bold, italic, headers, lists) |
| `output-organization.integration.test.ts` | Folder structure, URL generation, asset handling |
| `file-operations.integration.test.ts` | Create, read, rename, delete operations |
| `vault-walker.integration.test.ts` | File classification, metadata extraction, link parsing |
| `main.plugin.integration.test.ts` | Settings management, path validation, plugin workflow |
| `file-exporter.integration.test.ts` | Path validation, file export operations |
| `preview-server.integration.test.ts` | Server lifecycle, file serving, error handling |
| `clear-output.integration.test.ts` | Directory clearing, file removal |
| `clear-output-validation.integration.test.ts` | SiteGenerator clear method validation |
| `test-vault-management.integration.test.ts` | Test infrastructure setup/cleanup |

## Entry Points for Investigation

### Adding a New Feature
1. Start: `generators/site-generator.ts`
2. Add step to generation pipeline
3. Update: `settings/settings.ts` for configuration
4. Update: `types.ts` if new types needed

### Adding a New Markdown Feature
1. Start: `utils/markdown-processor.ts`
2. Add method to process new syntax
3. Call from `process()` or `processMarkdownSyntax()`
4. Tests: Create or update integration tests

### Fixing a Bug in Link Processing
1. Start: `utils/vault-walker.ts` for extraction
2. Check: `types.ts` for link structure
3. Tests: `vault-walker.integration.test.ts`

### Modifying File Export
1. Start: `exporters/file-exporter.ts`
2. Tests: `file-exporter.integration.test.ts`

### Changing Settings UI
1. Start: `settings/settings-tab.ts`
2. Config: `settings/settings.ts`

## Configuration Flow

1. User changes setting in Obsidian UI
2. `settings-tab.ts` updates `ArrowheadSettings`
3. Settings saved to vault config
4. Generation uses settings from plugin instance