# API Reference

This is a map to help you find interfaces and types when investigating the codebase.

## Key Interfaces

### ArrowheadSettings
**Location**: `src/settings/settings.ts`

Configuration interface defining all plugin settings:
- Output path, site metadata
- Processing options (sitemap, assets, wikilinks, embeds)
- Folder names and port configuration

### VaultData
**Location**: `src/types.ts`

Result structure from vault scanning:
- `files`: Processed files with metadata
- `tags`: Tags grouped by name
- `links`: Extracted links
- `excludedFiles`: Files skipped

### VaultFile
**Location**: `src/types.ts`

Individual file metadata:
- `path`: File path
- `content`: File content
- `frontmatter`: Parsed frontmatter
- `tags`: Extracted tags
- `links`: Extracted links
- `embeds`: Extracted embeds

### VaultLink
**Location**: `src/types.ts`

Link structure:
- `source`: Source file path
- `target`: Target file path or URL
- `type`: internal, broken, url, asset
- `displayText`: Optional display text

## Core Classes

### ArrowheadPlugin
**Location**: `src/main.ts`

Main plugin class extending Obsidian's Plugin:
- Implements `onload()` and `onunload()`
- Registers commands
- Manages settings
- Triggers generation

### VaultWalker
**Location**: `src/utils/vault-walker.ts`

Scans and categorizes vault files:
- `collectVaultData()`: Returns VaultData
- `classifyFile(path, postsFolder, pagesFolder)`: Returns type

### SiteGenerator
**Location**: `src/generators/site-generator.ts`

Orchestrates generation pipeline:
- `generateSite()`: Main generation method
- `clearOutputDirectory()`: Cleans output folder

### FileExporter
**Location**: `src/exporters/file-exporter.ts`

Handles file operations:
- `validateOutputPath()`: Validates and returns path info
- `getAbsoluteOutputPath()`: Returns absolute path
- `getRelativeOutputPath()`: Returns relative path

### PreviewServer
**Location**: `src/utils/preview-server.ts`

HTTP server for preview:
- `startServer(outputPath, port)`: Starts server
- `stopServer()`: Stops server
- `isServerRunning()`: Checks status

## Common Functions

### Path Validation
**Location**: `src/utils/path-resolver.ts`

- `isAbsolutePath(path)`: Checks if path is absolute
- `validateOutputPath(path, vaultPath)`: Validates output path

### Settings
**Location**: `src/settings/settings.ts`

- `DEFAULT_SETTINGS`: Default configuration values

## Where to Find Things

| What you need | Look in |
|---------------|---------|
| Settings definition | `src/settings/settings.ts` |
| File scanning logic | `src/utils/vault-walker.ts` |
| Generation pipeline | `src/generators/site-generator.ts` |
| File operations | `src/exporters/file-exporter.ts` |
| File types | `src/types.ts` |
| Plugin entry | `src/main.ts` |
| Settings UI | `src/settings/settings-tab.ts` |

## Data Structures

### File Classification
- Files starting with `postsFolder` (default: `posts/`) → Post
- Files starting with `pagesFolder` (default: `pages/`) → Page
- Files in `assets/` → Asset
- Others → Excluded

### Link Types
- `internal`: Target exists in vault
- `broken`: Target doesn't exist
- `url`: External HTTP link
- `asset`: Local file reference

## Testing Utilities

**Location**: `src/test-helpers.ts`

- `TestVaultManager`: Test vault creation/cleanup
- `OutputVerifier`: Validate generated output
- `createMockSettings()`: Mock settings factory
- `createMockPlugin()`: Mock plugin factory