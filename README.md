# Arrowhead Static Site Generator

A powerful Obsidian plugin that converts your entire vault into a complete static website. Build beautiful documentation sites, blogs, or knowledge bases from your Obsidian notes.

## Features

- **Full Vault Export**: Convert all your notes to static HTML
- **Wiki Link Support**: Automatically transforms `[[Wiki Links]]` to HTML hyperlinks
- **Asset Management**: Handles images, audio, video, and other attachments
- **Customizable Templates**: Multiple built-in themes + support for custom templates
- **SEO Ready**: Generates sitemap.xml and robots.txt automatically
- **Pretty URLs**: Clean URL structure (e.g., `/my-page/` instead of `/my-page.html`)
- **Configuration**: Extensive settings for customizing the output

## Installation

### From Obsidian (Recommended)

1. Open Obsidian
2. Go to Settings → Community Plugins
3. Disable Safe Mode
4. Search for "Arrowhead Static Site Generator"
5. Install and enable the plugin

### Manual Installation

1. Download the latest release from [GitHub](https://github.com/yourusername/arrowhead-obsidian-plugin/releases)
2. Extract the downloaded ZIP file
3. Copy the extracted folder to your Obsidian plugins directory:
   - Windows: `%APPDATA%\Obsidian\plugins\`
   - macOS: `~/Library/Application Support/obsidian/plugins/`
   - Linux: `~/.config/obsidian/plugins/`
4. Restart Obsidian
5. Enable the plugin in Settings → Community Plugins

## Quick Start

1. Open the plugin settings (Settings → Arrowhead Static Site Generator)
2. Configure your site information (title, description, URL)
3. Choose your output directory
4. Click the ribbon icon or use the command "Generate Static Site"
5. Your static site will be generated in the specified directory

## Configuration

### Site Information
- **Site Title**: Display name for your site
- **Site Description**: Used in meta tags for SEO
- **Site URL**: Full URL where your site will be hosted

### Output Settings
- **Output Directory**: Directory for generated files (relative to vault root)
- **File Extension**: `.html` or `.htm`
- **Pretty URLs**: Enable clean URLs like `/page/` instead of `/page.html`

### Template Settings
- **Template**: Choose from Default, Minimal, Notebook, or Custom
- **Custom CSS**: Path to additional CSS file
- **Custom JavaScript**: Path to additional JavaScript file

### Generation Options
- **Include Attachments**: Copy images and files to output
- **Generate Index**: Create a site index page
- **Generate Sitemap**: Create sitemap.xml for search engines
- **Generate Robots.txt**: Create robots.txt for SEO
- **Process Wiki Links**: Convert [[Links]] to HTML
- **Process Embeds**: Handle [[Image]] and note embeds

## Directory Structure

```
your-vault/
├── .obsidian/
│   └── plugins/
│       └── arrowhead-obsidian-plugin/
├── site-output/              # Generated static site
│   ├── assets/               # Copied attachments
│   │   └── images/
│   ├── page-one/
│   │   └── index.html
│   ├── page-two/
│   │   └── index.html
│   ├── sitemap.xml
│   ├── robots.txt
│   └── index.html
└── your-notes/
    ├── page-one.md
    └── page-two.md
```

## Custom Templates

To use a custom template:

1. Create a folder `templates/custom/` in your vault
2. Add `layout.html` as your main template
3. Use placeholders like:
   - `{{title}}` - Page title
   - `{{content}}` - Rendered page content
   - `{{siteTitle}}` - Site name from settings
   - `{{lastModified}}` - Last modified date

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{title}}` | Page title |
| `{{content}}` | Rendered HTML content |
| `{{siteTitle}}` | Site name from settings |
| `{{description}}` | Page description |
| `{{tags}}` | Page tags |
| `{{date}}` | Creation date |
| `{{lastModified}}` | Last modification date |
| `{{author}}` | Author from frontmatter |

## Commands

- **Generate Static Site**: Generate the complete static website
- **Preview Generated Site**: Preview the generated site (coming soon)
- **Export Site as ZIP**: Download as ZIP archive (coming soon)

## Development

### Setup

```bash
git clone https://github.com/yourusername/arrowhead-obsidian-plugin.git
cd arrowhead-obsidian-plugin
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Obsidian](https://obsidian.md) for an amazing note-taking app
- [esbuild](https://esbuild.github.io/) for fast bundling
- [TypeScript](https://www.typescriptlang.org/) for type safety

---

Made with 💡 for the Obsidian community