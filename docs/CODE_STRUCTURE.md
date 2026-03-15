# Code Structure

## Source Files

```
src/
├── main.ts                    ← Plugin class, commands, lifecycle
├── index.ts                   ← Plugin exports
├── types.ts                   ← Core type definitions
│
├── settings/
│   ├── settings.ts            ← Settings interface & defaults
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
│   ├── markdown-processor.ts  ← Unified markdown processing
│   ├── template-engine.ts     ← Template processing
│   └── preview-server.ts      ← HTTP preview server
│
└── ui/
    └── export-modal.ts        ← Export progress modal
```

## Key Files

### Core Plugin
- `main.ts`: Main plugin class extending Obsidian Plugin. Registers commands, handles settings, triggers generation.

### Processing Pipeline
- `generators/site-generator.ts`: The main orchestrator. Coordinates clearing output, walking vault, generating content, exporting files.
- `utils/markdown-processor.ts`: Handles wikilinks, embeds, markdown syntax conversion.
- `utils/template-engine.ts`: Template processing for HTML generation.

### Utilities
- `utils/vault-walker.ts`: Scans vault, classifies files, extracts frontmatter and metadata.
- `utils/path-utils.ts`: Path validation, resolution, URL encoding.
- `exporters/file-exporter.ts`: File operations - validates paths, copies files.

## Entry Points

### Adding a New Feature
1. Start: `generators/site-generator.ts`
2. Add step to generation pipeline
3. Update: `settings/settings.ts` for configuration

### Adding a New Markdown Feature
1. Start: `utils/markdown-processor.ts`
2. Add method to process new syntax
3. Call from `process()` or `processMarkdownSyntax()`

### Fixing Link Processing
1. Start: `utils/vault-walker.ts` for extraction
2. Check: `types.ts` for link structure

## Configuration Flow

1. User changes setting in Obsidian UI
2. `settings-tab.ts` updates `ArrowheadSettings`
3. Settings saved to vault config
4. Generation uses settings from plugin instance
