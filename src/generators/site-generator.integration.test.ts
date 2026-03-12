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
      copy: vi.fn().mockResolvedValue(undefined),
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
          getAbstractFileByPath: () => null
        },
        metadataCache: {
          getFileCache: () => ({ frontmatter: {} })
        }
      },
      getVaultRootPath: () => vaultPath
    };
  }

  function createVaultData(files: VaultFile[]): VaultData {
    return {
      files,
      folders: [],
      tags: new Map(),
      links: [],
      attachments: [],
      totalSize: 0,
      excludedFiles: []
    };
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
});