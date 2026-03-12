# Arrowhead Plugin - Developer Documentation

This folder contains documentation for developers and contributors.

## Overview

The Arrowhead Static Site Generator is an Obsidian plugin that converts markdown files from your vault into a complete static HTML website.

## Documentation Structure

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and data flow |
| [CODE_STRUCTURE.md](CODE_STRUCTURE.md) | File-by-file guide to the codebase |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup and workflow |
| [TESTING.md](TESTING.md) | Testing approach and guidelines |
| [API_REFERENCE.md](API_REFERENCE.md) | Key interfaces and types |

## Quick Links

- **Bug Reports**: GitHub Issues
- **Source Code**: https://codeberg.org/greenkey/arrowhead
- **Obsidian API**: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin

## For LLM Agents

When working with this codebase:

1. Start with [ARCHITECTURE.md](ARCHITECTURE.md) to understand the data flow
2. Use [CODE_STRUCTURE.md](CODE_STRUCTURE.md) to locate specific functionality
3. Reference [API_REFERENCE.md](API_REFERENCE.md) for type definitions
4. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for setup and coding standards
5. See [TESTING.md](TESTING.md) for testing approach

## Key Concepts

- **Vault Walker**: Scans and categorizes vault files
- **Site Generator**: Orchestrates the generation pipeline
- **File Exporter**: Handles file operations and path resolution
- **Preview Server**: Local HTTP server for development

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev` for development
4. Run tests with `npm run test`