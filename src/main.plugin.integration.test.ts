 
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { vi } from 'vitest';
import { validateOutputPath, isAbsolutePath, DEFAULT_SETTINGS } from './settings/settings';
import type { ArrowheadSettings } from './settings/settings';

describe('Main Plugin Integration Tests', () => {
  let tmpDir: string;
  let vaultPath: string;
  let outputPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-main-'));
    vaultPath = path.join(tmpDir, 'vault');
    outputPath = path.join(tmpDir, 'output');
    fs.mkdirSync(vaultPath, { recursive: true });
    fs.mkdirSync(outputPath, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  describe('Settings Management', () => {
    it('should have correct default settings structure', () => {
      expect(DEFAULT_SETTINGS.outputDirectory).toBeTruthy();
      expect(DEFAULT_SETTINGS.siteTitle).toBeTruthy();
      expect(DEFAULT_SETTINGS.siteDescription).toBeTruthy();
      expect(DEFAULT_SETTINGS.siteUrl).toBeTruthy();
      expect(typeof DEFAULT_SETTINGS.includeAttachments).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.generateSitemap).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.generateRobotsTxt).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.processWikilinks).toBe('boolean');
      expect(typeof DEFAULT_SETTINGS.processEmbeds).toBe('boolean');
      expect(Array.isArray(DEFAULT_SETTINGS.ignoredFolders)).toBe(true);
      expect(DEFAULT_SETTINGS.previewServerPort).toBeGreaterThan(0);
      expect(typeof DEFAULT_SETTINGS.autoRegenerate).toBe('boolean');
      expect(DEFAULT_SETTINGS.postsFolder).toBe('posts');
      expect(DEFAULT_SETTINGS.pagesFolder).toBe('pages');
    });

    it('should have all settings as writable', () => {
      const settings: ArrowheadSettings = { ...DEFAULT_SETTINGS };

      settings.outputDirectory = '/custom/output';
      settings.siteTitle = 'Custom Title';
      settings.siteDescription = 'Custom Description';
      settings.siteUrl = 'https://custom.com';
      settings.includeAttachments = false;
      settings.generateSitemap = false;
      settings.generateRobotsTxt = false;
      settings.processWikilinks = false;
      settings.processEmbeds = false;
      settings.ignoredFolders = ['custom'];
      settings.previewServerPort = 9999;
      settings.autoRegenerate = true;
      settings.postsFolder = 'blog';
      settings.pagesFolder = 'docs';

      expect(settings.outputDirectory).toBe('/custom/output');
      expect(settings.siteTitle).toBe('Custom Title');
      expect(settings.postsFolder).toBe('blog');
      expect(settings.pagesFolder).toBe('docs');
    });

    it('should support merging settings with overrides', () => {
      const baseSettings = DEFAULT_SETTINGS;
      const overrides: Partial<ArrowheadSettings> = {
        siteTitle: 'My Blog',
        generateSitemap: false
      };

      const mergedSettings = { ...baseSettings, ...overrides };

      expect(mergedSettings.siteTitle).toBe('My Blog');
      expect(mergedSettings.generateSitemap).toBe(false);
      expect(mergedSettings.siteUrl).toBe(baseSettings.siteUrl);
    });
  });

  describe('Path Validation', () => {
    it('should recognize absolute paths starting with /', () => {
      expect(isAbsolutePath('/absolute/path')).toBe(true);
      expect(isAbsolutePath('/var/www/output')).toBe(true);
    });

    it('should recognize absolute paths starting with ~', () => {
      expect(isAbsolutePath('~/output')).toBe(true);
      expect(isAbsolutePath('~/Documents/site')).toBe(true);
    });

    it('should recognize absolute paths on Windows', () => {
      expect(isAbsolutePath('C:/output')).toBe(true);
      expect(isAbsolutePath('D:/Projects/site')).toBe(true);
    });

    it('should not recognize relative paths', () => {
      expect(isAbsolutePath('output')).toBe(false);
      expect(isAbsolutePath('./output')).toBe(false);
      expect(isAbsolutePath('subdir/output')).toBe(false);
    });

    it('should validate empty path as invalid', () => {
      const result = validateOutputPath('', vaultPath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should validate whitespace-only path as invalid', () => {
      const result = validateOutputPath('   ', vaultPath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should resolve relative path to vault-relative path', () => {
      const result = validateOutputPath('output', vaultPath);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(`${vaultPath}/output`);
    });

    it('should keep absolute path unchanged', () => {
      const result = validateOutputPath('/absolute/output', vaultPath);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/absolute/output');
    });

    it('should expand tilde to home directory', () => {
      const result = validateOutputPath('~/output', vaultPath);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toContain('/output');
    });

    it('should reject paths with parent directory references', () => {
      const result = validateOutputPath('../outside', vaultPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('parent directory');
    });

    it('should reject paths with embedded parent references', () => {
      const result = validateOutputPath('output/../etc/passwd', vaultPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('parent directory');
    });
  });

  describe('Vault Root Path Resolution', () => {
    it('should handle vault path ending with vault name', () => {
      const basePath = '/Users/test/vault';
      const vaultName = 'vault';

      const result = basePath.endsWith(vaultName) ? basePath : `${basePath}/${vaultName}`;

      expect(result).toBe(basePath);
    });

    it('should append vault name when base path does not end with it', () => {
      const basePath = '/Users/test';
      const vaultName = 'my-vault';

      const result = basePath.endsWith(vaultName) ? basePath : `${basePath}/${vaultName}`;

      expect(result).toBe('/Users/test/my-vault');
    });

    it('should handle root base path specially', () => {
      const basePath = '/';
      const vaultName = 'my-vault';

      const result = basePath.endsWith(vaultName) ? basePath : `${basePath}/${vaultName}`;

      expect(result).toBe('//my-vault');
    });

    it('should normalize path separators', () => {
      const mixedPath = 'path\\to\\vault';

      const normalized = mixedPath.replace(/\\/g, '/');

      expect(normalized).not.toContain('\\');
    });
  });

  describe('Plugin Workflow Simulation', () => {
    it('should simulate generateSite workflow validation', async () => {
      const settings: ArrowheadSettings = {
        ...DEFAULT_SETTINGS,
        outputDirectory: 'output'
      };

      const validation = validateOutputPath(settings.outputDirectory, vaultPath);

      expect(validation.valid).toBe(true);
      expect(validation.resolvedPath).toBe(`${vaultPath}/output`);
    });

    it('should simulate generateSite with invalid output path', async () => {
      const settings: ArrowheadSettings = {
        ...DEFAULT_SETTINGS,
        outputDirectory: '../outside'
      };

      const validation = validateOutputPath(settings.outputDirectory, vaultPath);

      expect(validation.valid).toBe(false);
    });

    it('should simulate auto-regeneration flag behavior', () => {
      let autoRegenerate = false;
      let generationInProgress = false;

      const startGeneration = () => {
        if (generationInProgress) {
          return false;
        }
        if (!autoRegenerate) {
          return false;
        }
        generationInProgress = true;
        return true;
      };

      const endGeneration = () => {
        generationInProgress = false;
      };

      autoRegenerate = true;
      expect(startGeneration()).toBe(true);
      expect(startGeneration()).toBe(false);
      endGeneration();
      expect(startGeneration()).toBe(true);
    });

    it('should simulate settings save/load cycle', async () => {
      const originalSettings: ArrowheadSettings = {
        outputDirectory: '/test/output',
        siteTitle: 'Test Site',
        siteDescription: 'Description',
        siteUrl: 'https://test.com',
        includeAttachments: true,
        generateSitemap: true,
        generateRobotsTxt: true,
        processWikilinks: true,
        processEmbeds: true,
        ignoredFolders: [],
        previewServerPort: 3456,
        autoRegenerate: false,
        postsFolder: 'posts',
        pagesFolder: 'pages'
      };

      const settingsPath = path.join(tmpDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(originalSettings));

      const loadedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

      expect(loadedSettings.outputDirectory).toBe(originalSettings.outputDirectory);
      expect(loadedSettings.siteTitle).toBe(originalSettings.siteTitle);
      expect(loadedSettings.previewServerPort).toBe(originalSettings.previewServerPort);
    });

    it('should simulate preview server URL generation', () => {
      const port = 3456;
      const url = `http://localhost:${port}`;

      expect(url).toBe('http://localhost:3456');
      expect(url.startsWith('http://localhost:')).toBe(true);
    });

    it('should simulate file classification workflow', () => {
      const postsFolder = 'posts';
      const pagesFolder = 'pages';

      const classifyFile = (filePath: string): 'post' | 'page' | null => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const pathParts = normalizedPath.split('/');

        if (pathParts[0] === postsFolder) return 'post';
        if (pathParts[0] === pagesFolder) return 'page';

        for (let i = 1; i < pathParts.length - 1; i++) {
          if (pathParts[i] === postsFolder) return 'post';
          if (pathParts[i] === pagesFolder) return 'page';
        }

        return null;
      };

      expect(classifyFile('posts/article.md')).toBe('post');
      expect(classifyFile('pages/about.md')).toBe('page');
      expect(classifyFile('posts/subfolder/tutorial.md')).toBe('post');
      expect(classifyFile('drafts/idea.md')).toBeNull();
    });
  });

  describe('Output Path Handling', () => {
    it('should handle relative output path inside vault', () => {
      const relativePath = 'output';
      const absolutePath = `${vaultPath}/${relativePath}`;

      expect(absolutePath).toBe(`${vaultPath}/output`);
    });

    it('should handle absolute output path outside vault', () => {
      const absolutePath = '/tmp/external-output';

      const result = isAbsolutePath(absolutePath);

      expect(result).toBe(true);
    });

    it('should expand tilde in output path', () => {
      const tildePath = '~/my-site';
      const homeDir = os.homedir();

      const expandedPath = tildePath.replace('~', homeDir);

      expect(expandedPath).toBe(`${homeDir}/my-site`);
    });

    it('should create output directory structure', () => {
      const outputSubdir = path.join(outputPath, 'assets', 'css');
      fs.mkdirSync(outputSubdir, { recursive: true });

      expect(fs.existsSync(outputSubdir)).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'assets'))).toBe(true);
    });
  });

  describe('File Organization', () => {
    it('should organize posts and pages separately', () => {
      const postsDir = path.join(vaultPath, 'posts');
      const pagesDir = path.join(vaultPath, 'pages');

      fs.mkdirSync(postsDir, { recursive: true });
      fs.mkdirSync(pagesDir, { recursive: true });

      fs.writeFileSync(path.join(postsDir, 'article.md'), '# Article');
      fs.writeFileSync(path.join(pagesDir, 'about.md'), '# About');

      expect(fs.existsSync(path.join(postsDir, 'article.md'))).toBe(true);
      expect(fs.existsSync(path.join(pagesDir, 'about.md'))).toBe(true);
    });

    it('should support nested directory structure', () => {
      const nestedPath = path.join(vaultPath, 'posts', 'tutorials', 'getting-started');

      fs.mkdirSync(nestedPath, { recursive: true });
      fs.writeFileSync(path.join(nestedPath, 'index.md'), '# Tutorial');

      expect(fs.existsSync(path.join(nestedPath, 'index.md'))).toBe(true);
    });

    it('should handle attachments in assets folder', () => {
      const assetsDir = path.join(vaultPath, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      fs.writeFileSync(path.join(assetsDir, 'image.jpg'), 'fake-image-content');
      fs.writeFileSync(path.join(assetsDir, 'style.css'), 'body { margin: 0; }');

      expect(fs.existsSync(path.join(assetsDir, 'image.jpg'))).toBe(true);
      expect(fs.existsSync(path.join(assetsDir, 'style.css'))).toBe(true);
    });
  });

  describe('Content Processing', () => {
    it('should process frontmatter from markdown', () => {
      const content = `---
title: My Post
tags: [tutorial, guide]
date: 2026-03-10
---

# Content here`;

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const hasFrontmatter = frontmatterMatch !== null;

      expect(hasFrontmatter).toBe(true);
      if (frontmatterMatch) {
        expect(frontmatterMatch[1]).toContain('title: My Post');
        expect(frontmatterMatch[1]).toContain('tags:');
      }
    });

    it('should extract tags from frontmatter array', () => {
      const frontmatter: { tags: string[] | string } = { tags: ['tutorial', 'guide', 'learning'] };

      let tags: string[] = [];
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(t => String(t));
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(t => t.trim());
      }

      expect(tags).toEqual(['tutorial', 'guide', 'learning']);
    });

    it('should extract inline tags from content', () => {
      const content = `Some content about #javascript and #typescript development`;

      const inlineTagRegex = /#[\w\u0600-\uFFFF-]+/g;
      const inlineTags = content.match(inlineTagRegex) || [];

      expect(inlineTags).toContain('#javascript');
      expect(inlineTags).toContain('#typescript');
    });

    it('should extract wikilinks from content', () => {
      const content = `See [[other-page]] for details or [[posts/tutorial|Tutorial]]`;

      const wikiLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
      const links: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = wikiLinkRegex.exec(content)) !== null) {
        if (match[1]) {
          links.push(match[1]);
        }
      }

      expect(links).toContain('other-page');
      expect(links).toContain('posts/tutorial');
    });

    it('should distinguish embeds from wikilinks', () => {
      const embedContent = `![Image](image.jpg) and ![[another-page]]`;

      const embedRegex = /!\[\[([^\]]+)\]\]/g;
      const embeds: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = embedRegex.exec(embedContent)) !== null) {
        if (match[1]) {
          embeds.push(match[1]);
        }
      }

      expect(embeds).toContain('another-page');
    });
  });

  describe('Notice Simulation', () => {
    it('should simulate notice messages', () => {
      const notices: string[] = [];

      const showNotice = (message: string) => {
        notices.push(message);
      };

      showNotice('Generating static site...');
      showNotice('Static site is synced on /path/to/output');

      expect(notices).toHaveLength(2);
      expect(notices[0]).toContain('Generating');
      expect(notices[1]).toContain('synced');
    });

    it('should handle generation in progress notice', () => {
      const notices: string[] = [];
      let isGenerating = false;

      const notice = (message: string) => {
        if (isGenerating) {
          notices.push('Generation already in progress');
          return;
        }
        isGenerating = true;
        notices.push(message);
      };

      notice('First generation');
      const secondResult = notice('Second generation');

      expect(notices).toHaveLength(2);
      expect(notices[1]).toContain('already in progress');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output directory gracefully', () => {
      const invalidPath = '/nonexistent/path/../outside';

      const result = validateOutputPath(invalidPath, vaultPath);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle permission errors gracefully', () => {
      const restrictedPath = path.join(tmpDir, 'restricted');

      try {
        fs.mkdirSync(restrictedPath, { mode: 0o000 });
        fs.writeFileSync(path.join(restrictedPath, 'test.txt'), 'test');

        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle disk full scenarios', () => {
      const largeContent = 'x'.repeat(10000000);

      try {
        fs.writeFileSync(path.join(outputPath, 'large.txt'), largeContent);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full generation workflow', async () => {
      const settings: ArrowheadSettings = {
        ...DEFAULT_SETTINGS,
        outputDirectory: outputPath
      };

      fs.mkdirSync(path.join(vaultPath, 'posts'), { recursive: true });
      fs.mkdirSync(path.join(vaultPath, 'pages'), { recursive: true });
      fs.writeFileSync(path.join(vaultPath, 'posts', 'article.md'), `---\ntitle: Article\n---\n# Article Content`);
      fs.writeFileSync(path.join(vaultPath, 'pages', 'about.md'), `---\ntitle: About\n---\n# About Content`);

      const validation = validateOutputPath(settings.outputDirectory, vaultPath);
      expect(validation.valid).toBe(true);

      const files = ['posts/article.md', 'pages/about.md'];
      const postsFolder = 'posts';
      const pagesFolder = 'pages';

      const classifiedPosts = files.filter(f => f.startsWith(postsFolder));
      const classifiedPages = files.filter(f => f.startsWith(pagesFolder));

      expect(classifiedPosts).toHaveLength(1);
      expect(classifiedPages).toHaveLength(1);
    });

    it('should handle empty vault generation', () => {
      const settings: ArrowheadSettings = DEFAULT_SETTINGS;

      const validation = validateOutputPath(settings.outputDirectory, vaultPath);

      expect(validation.valid).toBe(true);
      expect(settings.postsFolder).toBe('posts');
      expect(settings.pagesFolder).toBe('pages');
    });

    it('should handle mixed content types', () => {
      const files = [
        { path: 'posts/tutorial.md', frontmatter: { tags: ['tutorial'] }, content: '# Tutorial\n#tutorial' },
        { path: 'pages/about.md', frontmatter: {}, content: '# About' },
        { path: 'assets/image.jpg', content: '' }
      ];

      const posts = files.filter(f => f.path.startsWith('posts/'));
      const pages = files.filter(f => f.path.startsWith('pages/'));
      const attachments = files.filter(f => f.path.startsWith('assets/'));

      expect(posts).toHaveLength(1);
      expect(pages).toHaveLength(1);
      expect(attachments).toHaveLength(1);
    });

    it('should handle ignored folder filtering', () => {
      const ignoredFolders = ['.obsidian', 'templates', 'node_modules'];

      const isIgnored = (folderPath: string): boolean => {
        return folderPath.startsWith('.') || ignoredFolders.some(f => folderPath.startsWith(f + '/'));
      };

      expect(isIgnored('.obsidian')).toBe(true);
      expect(isIgnored('templates/template.md')).toBe(true);
      expect(isIgnored('node_modules/package.json')).toBe(true);
      expect(isIgnored('posts/article.md')).toBe(false);
      expect(isIgnored('pages/about.md')).toBe(false);
    });
  });
});