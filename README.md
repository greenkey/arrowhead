# Arrowhead Static Site Generator

Convert your Obsidian vault to a complete static HTML website. The plugin scans your vault, processes markdown files with full formatting support, and generates a clean static site structure ready for deployment.

## Quick Start

1. Create `pages/` and `posts/` folders in your vault root
2. Add markdown files with frontmatter (title, date, optional tags)
3. Configure output directory in Settings → Arrowhead Static Site Generator
4. Click the ribbon icon or run "Generate Static Site" command

Your vault structure:
```
your-vault/
├── pages/              # Main site pages
│   └── about.md
├── posts/              # Blog posts/articles
│   └── hello-world.md
├── assets/             # Images and files (copied as-is)
│   └── images/
└── site-output/        # Generated static site
    ├── pages/
    ├── posts/
    ├── assets/
    └── index.html
```

## Main Features

### Site Structure
- **Pages**: Files in `pages/` become main site pages
- **Posts**: Files in `posts/` become blog posts/articles
- **Assets**: Files in `assets/` are copied to output
- **Index**: Automatic site index generation (optional)

### Markdown Processing
- **Formatting**: Bold (`**text**`), italic (`*text*`)
- **Headers**: H1, H2, H3 with proper hierarchy
- **Lists**: Bullet points with nested support
- **Links**: Wiki links (`[[page]]`) and markdown links (`[text](url)`)
- **Tags**: Frontmatter tags and inline `#tags`

### Site Generation
- **Clean URLs**: Optional pretty URLs (`/page/` instead of `/page.html`)
- **Sitemap**: Automatic sitemap.xml generation (optional)
- **Robots**: Automatic robots.txt generation (optional)
- **Preview**: Built-in local preview server

### Configuration
- **Output Directory**: Relative or absolute path
- **Custom Folders**: Rename posts/pages folders
- **Ignored Folders**: Exclude directories from processing
- **Asset Copying**: Toggle image/attachment copying

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Output Directory | Where to generate the site | `site-output` |
| Site Title | Name for your site | My Static Site |
| Site Description | Meta description | |
| Site URL | Full URL where site will be hosted | |
| Pages Folder | Folder for pages | `pages` |
| Posts Folder | Folder for posts | `posts` |
| Generate Sitemap | Create sitemap.xml | On |
| Generate Robots.txt | Create robots.txt | On |
| Include Attachments | Copy assets folder | On |
| Process Wikilinks | Convert [[links]] | On |
| Process Embeds | Handle ![[embeds]] | On |
| Preview Server Port | Local preview port | 3456 |

## Commands

- **Generate Static Site**: Generate the complete static website
- **Preview Site**: Open local preview server

## Installation

1. Open Obsidian
2. Go to Settings → Community Plugins
3. Search for "Arrowhead Static Site Generator"
4. Install and enable the plugin

## Requirements

- Obsidian 1.5.0 or later

## For Developers

See the [docs/](docs/) folder for:
- Architecture overview
- Code structure guide
- Contributing guidelines
- Testing documentation

---

## About This Project

This plugin and its documentation were created with the assistance of [Opencode](https://opencode.ai), an AI-powered development tool for software engineers.# Test Fri Mar 13 08:48:20 CET 2026
