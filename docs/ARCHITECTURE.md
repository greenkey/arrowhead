# System Architecture

## Core Components

```
Obsidian Plugin
     │
     ├── main.ts          ← Plugin entry point, Obsidian lifecycle
     │
     ├── settings/        ← Configuration management
     │    ├── settings.ts    ← Settings interface & defaults
     │    └── settings-tab.ts ← UI settings screen
     │
     ├── generators/      ← Core generation logic
     │    └── site-generator.ts ← Orchestrates the full pipeline
     │
     ├── exporters/       ← File operations
     │    └── file-exporter.ts  ← File system operations
     │
     ├── utils/           ← Utility functions
     │    ├── vault-walker.ts   ← Scans & categorizes vault files
     │    ├── path-resolver.ts  ← Path validation & resolution
     │    ├── template-engine.ts← Template processing
     │    └── preview-server.ts ← HTTP server for preview
     │
     ├── ui/              ← User interface
     │    └── export-modal.ts   ← Export progress modal
     │
     └── types.ts         ← Core type definitions
```

## Data Flow

```
Vault Files (markdown, assets)
        │
        ▼
   ┌─────────────────┐
   │   Vault Walker  │  ← Scans vault, extracts metadata
   │  (vault-walker) │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │   VaultData     │  ← Structured result with files, tags, links
   │   Structure     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Site Generator │  ← Orchestrates all processing
   │ (site-generator)│
   └────────┬────────┘
            │
            ├──┬─────────────┐
            ▼  ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ File     │ │ Template │ │ Preview  │
   │ Exporter │ │ Engine   │ │ Server   │
   └──────────┘ └──────────┘ └──────────┘
            │
            ▼
      Output Files
   (HTML, assets, sitemap)
```

## Processing Steps

1. **Scan**: Vault walker traverses `pages/`, `posts/`, `assets/` folders
2. **Classify**: Each file categorized as page, post, or asset
3. **Extract**: Frontmatter and inline tags, wikilinks, embeds
4. **Generate**: Convert markdown to HTML with templates
5. **Export**: Write files to output directory
6. **Optional**: Generate sitemap.xml, robots.txt

## Key Abstractions

### VaultData
Result of vault scanning containing:
- `files`: All processed files with metadata
- `tags`: Tags grouped by name
- `links`: All extracted links
- `excludedFiles`: Files skipped due to ignored folders

### Settings (ArrowheadSettings)
Configuration interface defining:
- Output path and site metadata
- Processing options (sitemap, assets, wikilinks, embeds)
- Folder names and port configuration

## File Classification

Files are classified based on their path:

- `pages/**` → Page
- `posts/**` → Post
- `assets/**` → Asset (copied but not processed)
- Other folders → Excluded (unless in ignoredFolders config)

## Link Resolution

Links are processed to detect:
- **Internal**: Target exists in vault
- **Broken**: Target doesn't exist
- **External**: External URLs
- **Asset**: Local image/file references

## Output Structure

Generated site structure mirrors vault:
```
output/
├── pages/
│   ├── page-name/
│   │   └── index.html
│   └── about.html
├── posts/
│   └── post-name/
│       └── index.html
├── assets/
│   ├── images/
│   └── files/
├── sitemap.xml (optional)
├── robots.txt (optional)
└── index.html
```