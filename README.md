# Arrowhead Static Site Generator

Convert your Obsidian vault to a complete static HTML website.

## What It Does

1. Scans your vault for `pages/` and `posts/` folders
2. Converts markdown to HTML with formatting preserved
3. Processes wiki links and markdown links
4. Copies images and assets to the output directory
5. Generates a complete static site ready for publishing

## Quick Start

1. Create `pages/` and `posts/` folders in your vault root
2. Add markdown files with frontmatter (title, date, optional tags)
3. Open Settings → Arrowhead Static Site Generator
4. Set your output directory
5. Click the ribbon icon or run "Generate Static Site" command

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