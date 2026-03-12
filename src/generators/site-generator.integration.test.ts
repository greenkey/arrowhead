import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SiteGenerator } from './site-generator';
import { VaultData, VaultFile } from '../utils/vault-walker';
import { vi } from 'vitest';

describe('SiteGenerator Integration Tests', () => {
  let tmpDir: string;
  let vaultPath: string;
  let outputPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
    vaultPath = path.join(tmpDir, 'vault');
    outputPath = path.join(tmpDir, 'output');
    fs.mkdirSync(vaultPath, { recursive: true });
    fs.mkdirSync(outputPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function createMockPlugin(outputDir: string): any {
    const adapter = {
      exists: vi.fn().mockImplementation((p: string) => Promise.resolve(fs.existsSync(p))),
      mkdir: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockImplementation((p: string) => {
        if (!fs.existsSync(p)) return Promise.resolve({ files: [], folders: [] });
        const entries = fs.readdirSync(p, { withFileTypes: true });
        const basePath = p.endsWith('/') ? p : p + '/';
        return Promise.resolve({
          files: entries.filter(e => e.isFile()).map(e => basePath + e.name),
          folders: entries.filter(e => e.isDirectory()).map(e => basePath + e.name)
        });
      }),
      remove: vi.fn().mockImplementation((p: string) => {
        if (fs.existsSync(p)) {
          if (fs.statSync(p).isDirectory()) {
            fs.rmSync(p, { recursive: true, force: true });
          } else {
            fs.unlinkSync(p);
          }
        }
        return Promise.resolve(undefined);
      }),
      write: vi.fn().mockImplementation((p: string, content: string) => {
        fs.writeFileSync(p, content, 'utf-8');
        return Promise.resolve(undefined);
      }),
      read: vi.fn().mockResolvedValue(''),
      copy: vi.fn().mockImplementation(async (source: string, target: string) => {
        const sourcePath = path.isAbsolute(source) ? source : path.join(vaultPath, source);
        if (fs.existsSync(sourcePath)) {
          const content = fs.readFileSync(sourcePath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, content);
        }
      }),
      getBasePath: vi.fn().mockReturnValue(vaultPath),
      cachedRead: vi.fn().mockResolvedValue('')
    };

    return {
      settings: {
        outputDirectory: outputDir,
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        includeAttachments: false,
        generateSitemap: false,
        generateRobotsTxt: false,
        processWikilinks: false,
        processEmbeds: false,
        ignoredFolders: [],
        previewServerPort: 3000,
        autoRegenerate: false,
        postsFolder: 'posts',
        pagesFolder: 'pages'
      },
      app: {
        vault: {
          adapter,
          getName: () => 'test-vault',
          getAbstractFileByPath: (filePath: string) => {
            if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.gif')) {
              return mockFile(filePath, path.basename(filePath));
            }
            return null;
          }
        },
        metadataCache: {
          getFileCache: () => ({ frontmatter: {} })
        }
      },
      getVaultRootPath: () => vaultPath
    };
  }

  function createVaultData(files: VaultFile[], attachments: VaultFile[] = []): VaultData {
    return {
      files,
      folders: [],
      tags: new Map(),
      links: [],
      attachments,
      totalSize: 0,
      excludedFiles: []
    };
  }

  function mockFile(path: string, name: string): any {
    return { path, name, stat: { mtime: Date.now() } };
  }

  describe('HTML output generation', () => {
    it('should generate index.html with posts and pages', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/about.md',
          name: 'about.md',
          extension: 'md',
          content: '---\ntitle: About\n---\nThis is the about page',
          frontmatter: { title: 'About' },
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        },
        {
          path: 'posts/hello-world.md',
          name: 'hello-world.md',
          extension: 'md',
          content: '---\ntitle: Hello World\ndate: 2024-01-15\n---\nHello from my first post!',
          frontmatter: { title: 'Hello World', date: '2024-01-15' },
          tags: ['test'],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'post'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const indexPath = path.join(outputPath, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent).toContain('Test Site');
      expect(indexContent).toContain('About');
      expect(indexContent).toContain('Hello World');
    });

    it('should generate individual HTML files for each page', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/test-page.md',
          name: 'test-page.md',
          extension: 'md',
          content: '---\ntitle: Test Page\n---\n# Test Page\nThis is test content',
          frontmatter: { title: 'Test Page' },
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const htmlPath = path.join(outputPath, 'pages', 'test-page.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      expect(htmlContent).toContain('Test Page');
      expect(htmlContent).toContain('This is test content');
    });

    it('should copy template CSS to output', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/empty.md',
          name: 'empty.md',
          extension: 'md',
          content: '---',
          frontmatter: {},
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 0,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const cssPath = path.join(outputPath, 'assets', 'styles.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent.length).toBeGreaterThan(0);
    });

    it('should generate sitemap.xml when enabled', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.generateSitemap = true;
      mockPlugin.settings.siteUrl = 'https://example.com';

      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/test.md',
          name: 'test.md',
          extension: 'md',
          content: '---',
          frontmatter: {},
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 0,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const sitemapPath = path.join(outputPath, 'sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
      expect(sitemapContent).toContain('<?xml');
      expect(sitemapContent).toContain('https://example.com');
    });

    it('should generate robots.txt when enabled', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.generateRobotsTxt = true;
      mockPlugin.settings.siteUrl = 'https://example.com';

      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([]);

      await generator.generate(vaultData, outputPath);

      const robotsPath = path.join(outputPath, 'robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
      expect(robotsContent).toContain('User-agent: *');
      expect(robotsContent).toContain('https://example.com/sitemap.xml');
    });

    it('should process markdown headers in content', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/markdown.md',
          name: 'markdown.md',
          extension: 'md',
          content: `---
title: Markdown Test
---
# Main Header
## Sub Header
### Sub Sub Header

**Bold text** and *italic text*

- List item 1
- List item 2
`,
          frontmatter: { title: 'Markdown Test' },
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const htmlPath = path.join(outputPath, 'pages', 'markdown.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('<h1>Main Header</h1>');
      expect(htmlContent).toContain('<h2>Sub Header</h2>');
      expect(htmlContent).toContain('<h3>Sub Sub Header</h3>');
      expect(htmlContent).toContain('<strong>Bold text</strong>');
      expect(htmlContent).toContain('<em>italic text</em>');
    });
  });

  describe('End-to-end generation workflow', () => {
    it('should create all expected output files from vault data', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.generateSitemap = true;
      mockPlugin.settings.siteUrl = 'https://example.com';

      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/home.md',
          name: 'home.md',
          extension: 'md',
          content: '---\ntitle: Home\n---\nWelcome home',
          frontmatter: { title: 'Home' },
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 50,
          pageType: 'page'
        },
        {
          path: 'posts/article.md',
          name: 'article.md',
          extension: 'md',
          content: '---\ntitle: Article\ndate: 2024-02-01\n---\nArticle content here',
          frontmatter: { title: 'Article', date: '2024-02-01' },
          tags: ['news'],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 80,
          pageType: 'post'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      expect(fs.existsSync(path.join(outputPath, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'assets', 'styles.css'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'pages', 'home.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'sitemap.xml'))).toBe(true);

      const indexHtml = fs.readFileSync(path.join(outputPath, 'index.html'), 'utf-8');
      expect(indexHtml).toContain('Home');
      expect(indexHtml).toContain('Article');
    });

    it('should handle empty vault data gracefully', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([]);

      await expect(generator.generate(vaultData, outputPath)).resolves.not.toThrow();

      expect(fs.existsSync(path.join(outputPath, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'assets', 'styles.css'))).toBe(true);
    });
  });

  describe('Link processing', () => {
    it('should process wikilinks and convert to HTML anchors', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.processWikilinks = true;

      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/about.md',
          name: 'about.md',
          extension: 'md',
          content: `---
title: About Page
---
Welcome to our site. Check out our [[posts/first-post|awesome first post]]!

Also see [[pages/contact|contact us]] for more info.
`,
          frontmatter: { title: 'About Page' },
          tags: [],
          links: [
            { target: 'posts/first-post', originalText: '[[posts/first-post|awesome first post]]', displayText: 'awesome first post', type: 'wiki' },
            { target: 'pages/contact', originalText: '[[pages/contact]]', displayText: 'contact us', type: 'wiki' }
          ],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 150,
          pageType: 'page'
        },
        {
          path: 'posts/first-post.md',
          name: 'first-post.md',
          extension: 'md',
          content: `---
title: First Post
date: 2024-01-15
---
This is our first post content.
`,
          frontmatter: { title: 'First Post', date: '2024-01-15' },
          tags: ['welcome'],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'post'
        },
        {
          path: 'pages/contact.md',
          name: 'contact.md',
          extension: 'md',
          content: `---
title: Contact
---
Get in touch with us.
`,
          frontmatter: { title: 'Contact' },
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 50,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const aboutPath = path.join(outputPath, 'pages', 'about.html');
      const aboutContent = fs.readFileSync(aboutPath, 'utf-8');

      expect(aboutContent).toContain('href="/posts/first-post.html">awesome first post</a>');
      expect(aboutContent).toContain('href="/pages/contact.html">contact us</a>');
    });

    it('should process external markdown links', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.processWikilinks = false;

      const generator = new SiteGenerator(mockPlugin as any);

      const vaultData = createVaultData([
        {
          path: 'pages/reference.md',
          name: 'reference.md',
          extension: 'md',
          content: `---
title: Reference Page
---
Check out [Obsidian Help](https://help.obsidian.md/) for more info.

Also see [this cool project](https://github.com/anomalyco/arrowhead) on GitHub.
`,
          frontmatter: { title: 'Reference Page' },
          tags: [],
          links: [
            { target: 'https://help.obsidian.md/', originalText: '[Obsidian Help](https://help.obsidian.md/)', displayText: 'Obsidian Help', type: 'url' },
            { target: 'https://github.com/anomalyco/arrowhead', originalText: '[this cool project](https://github.com/anomalyco/arrowhead)', displayText: 'this cool project', type: 'url' }
          ],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const refPath = path.join(outputPath, 'pages', 'reference.html');
      const refContent = fs.readFileSync(refPath, 'utf-8');

      expect(refContent).toContain('<a href="https://help.obsidian.md/" target="_blank" rel="noopener">Obsidian Help</a>');
      expect(refContent).toContain('<a href="https://github.com/anomalyco/arrowhead" target="_blank" rel="noopener">this cool project</a>');
    });
  });

  describe('Attachment handling', () => {
    it('should copy attachments to assets folder when includeAttachments is enabled', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.includeAttachments = true;

      const generator = new SiteGenerator(mockPlugin as any);

      const imagePath = 'images/photo.jpg';
      const sourceImagePath = path.join(vaultPath, imagePath);
      fs.mkdirSync(path.dirname(sourceImagePath), { recursive: true });
      fs.writeFileSync(sourceImagePath, 'fake-image-content');

      const vaultData = createVaultData([
        {
          path: 'pages/with-image.md',
          name: 'with-image.md',
          extension: 'md',
          content: `---
title: Page with Image
---
![](/${imagePath})
`,
          frontmatter: { title: 'Page with Image' },
          tags: [],
          links: [],
          embeds: [imagePath],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        }
      ], [
        {
          path: imagePath,
          name: 'photo.jpg',
          extension: 'jpg',
          content: 'fake-image-content',
          frontmatter: {},
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 1024,
          pageType: undefined
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const assetsImagePath = path.join(outputPath, 'assets', imagePath);
      expect(fs.existsSync(assetsImagePath)).toBe(true);
    });

    it('should embed image references in generated HTML', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.includeAttachments = true;
      mockPlugin.settings.processEmbeds = true;

      const generator = new SiteGenerator(mockPlugin as any);

      const imagePath = 'diagram.png';
      const vaultData = createVaultData([
        {
          path: 'posts/tutorial.md',
          name: 'tutorial.md',
          extension: 'md',
          content: `---
title: Tutorial
date: 2024-03-01
---
See this diagram:

![](${imagePath})
`,
          frontmatter: { title: 'Tutorial', date: '2024-03-01' },
          tags: [],
          links: [],
          embeds: [imagePath],
          created: Date.now(),
          modified: Date.now(),
          size: 150,
          pageType: 'post'
        }
      ], [
        {
          path: imagePath,
          name: 'diagram.png',
          extension: 'png',
          content: 'binary-image-data',
          frontmatter: {},
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 2048,
          pageType: undefined
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const htmlPath = path.join(outputPath, 'posts', 'tutorial.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('<img');
      expect(htmlContent).toContain(imagePath);
    });

    it('should handle nested attachment paths', async () => {
      const mockPlugin = createMockPlugin(outputPath);
      mockPlugin.settings.includeAttachments = true;

      const generator = new SiteGenerator(mockPlugin as any);

      const nestedImagePath = 'resources/screenshots/main-view.png';
      const sourceImagePath = path.join(vaultPath, nestedImagePath);
      fs.mkdirSync(path.dirname(sourceImagePath), { recursive: true });
      fs.writeFileSync(sourceImagePath, 'image-data');

      const vaultData = createVaultData([
        {
          path: 'pages/guide.md',
          name: 'guide.md',
          extension: 'md',
          content: `---
title: Guide
---
![Main View](${nestedImagePath})
`,
          frontmatter: { title: 'Guide' },
          tags: [],
          links: [],
          embeds: [nestedImagePath],
          created: Date.now(),
          modified: Date.now(),
          size: 100,
          pageType: 'page'
        }
      ], [
        {
          path: nestedImagePath,
          name: 'main-view.png',
          extension: 'png',
          content: 'image-data',
          frontmatter: {},
          tags: [],
          links: [],
          embeds: [],
          created: Date.now(),
          modified: Date.now(),
          size: 4096,
          pageType: undefined
        }
      ]);

      await generator.generate(vaultData, outputPath);

      const assetsPath = path.join(outputPath, 'assets', 'resources', 'screenshots');
      expect(fs.existsSync(path.join(assetsPath, 'main-view.png'))).toBe(true);
    });
  });
});