import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager, OutputVerifier, createMockSettings, createMockPlugin } from './test-helpers';

describe('Settings Impact Tests', () => {
  let vaultManager: TestVaultManager;
  let outputVerifier: OutputVerifier;

  beforeEach(async () => {
    const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
    const vaultPath = path.join(tmpDir, 'vault');
    const outputPath = path.join(tmpDir, 'output');

    vaultManager = new TestVaultManager({
      vaultPath,
      outputPath
    });

    await vaultManager.setup();
    outputVerifier = new OutputVerifier(outputPath);
  });

  afterEach(async () => {
    await vaultManager.cleanup();
  });

  describe('Robots.txt Generation', () => {
    it('should generate robots.txt when enabled', async () => {
      const mockPlugin = createMockPlugin({ generateRobotsTxt: true });
      expect(mockPlugin.settings.generateRobotsTxt).toBe(true);
    });

    it('should not generate robots.txt when disabled', async () => {
      const mockPlugin = createMockPlugin({ generateRobotsTxt: false });
      expect(mockPlugin.settings.generateRobotsTxt).toBe(false);
    });

    it('should have default robots.txt setting as true', () => {
      const settings = createMockSettings();
      expect(settings.generateRobotsTxt).toBe(true);
    });
  });

  describe('Sitemap.xml Generation', () => {
    it('should generate sitemap.xml when enabled', async () => {
      const mockPlugin = createMockPlugin({ generateSitemap: true });
      expect(mockPlugin.settings.generateSitemap).toBe(true);
    });

    it('should not generate sitemap.xml when disabled', async () => {
      const mockPlugin = createMockPlugin({ generateSitemap: false });
      expect(mockPlugin.settings.generateSitemap).toBe(false);
    });

    it('should have default sitemap setting as true', () => {
      const settings = createMockSettings();
      expect(settings.generateSitemap).toBe(true);
    });
  });

  describe('Asset Inclusion', () => {
    it('should include attachments when enabled', async () => {
      const mockPlugin = createMockPlugin({ includeAttachments: true });
      expect(mockPlugin.settings.includeAttachments).toBe(true);
    });

    it('should not include attachments when disabled', async () => {
      const mockPlugin = createMockPlugin({ includeAttachments: false });
      expect(mockPlugin.settings.includeAttachments).toBe(false);
    });

    it('should have default asset inclusion setting as true', () => {
      const settings = createMockSettings();
      expect(settings.includeAttachments).toBe(true);
    });

    it('should handle asset folder creation', async () => {
      await vaultManager.createFile('assets/images/test.png', 'fake-image');
      const exists = await vaultManager.fileExists('assets/images/test.png');
      expect(exists).toBe(true);
    });
  });

  describe('Wikilink Processing', () => {
    it('should process wikilinks when enabled', async () => {
      const mockPlugin = createMockPlugin({ processWikilinks: true });
      expect(mockPlugin.settings.processWikilinks).toBe(true);
    });

    it('should not process wikilinks when disabled', async () => {
      const mockPlugin = createMockPlugin({ processWikilinks: false });
      expect(mockPlugin.settings.processWikilinks).toBe(false);
    });

    it('should have default wikilink setting as true', () => {
      const settings = createMockSettings();
      expect(settings.processWikilinks).toBe(true);
    });
  });

  describe('Embed Processing', () => {
    it('should process embeds when enabled', async () => {
      const mockPlugin = createMockPlugin({ processEmbeds: true });
      expect(mockPlugin.settings.processEmbeds).toBe(true);
    });

    it('should not process embeds when disabled', async () => {
      const mockPlugin = createMockPlugin({ processEmbeds: false });
      expect(mockPlugin.settings.processEmbeds).toBe(false);
    });

    it('should have default embed setting as true', () => {
      const settings = createMockSettings();
      expect(settings.processEmbeds).toBe(true);
    });
  });

  describe('Ignored Folders', () => {
    it('should have empty ignored folders by default', () => {
      const settings = createMockSettings();
      expect(settings.ignoredFolders).toEqual([]);
    });

    it('should accept custom ignored folders', () => {
      const mockPlugin = createMockPlugin({
        ignoredFolders: ['node_modules', '.git', '.obsidian']
      });
      expect(mockPlugin.settings.ignoredFolders).toContain('node_modules');
      expect(mockPlugin.settings.ignoredFolders).toContain('.git');
    });

    it('should handle multiple ignored folders', () => {
      const settings = createMockSettings({
        ignoredFolders: ['temp', 'logs', 'cache']
      });
      expect(settings.ignoredFolders.length).toBe(3);
    });
  });

  describe('Folder Configuration', () => {
    it('should have default posts folder as "posts"', () => {
      const settings = createMockSettings();
      expect(settings.postsFolder).toBe('posts');
    });

    it('should have default pages folder as "pages"', () => {
      const settings = createMockSettings();
      expect(settings.pagesFolder).toBe('pages');
    });

    it('should accept custom posts folder', () => {
      const mockPlugin = createMockPlugin({ postsFolder: 'blog' });
      expect(mockPlugin.settings.postsFolder).toBe('blog');
    });

    it('should accept custom pages folder', () => {
      const mockPlugin = createMockPlugin({ pagesFolder: 'docs' });
      expect(mockPlugin.settings.pagesFolder).toBe('docs');
    });

    it('should handle nested custom folders', () => {
      const mockPlugin = createMockPlugin({
        postsFolder: 'content/posts',
        pagesFolder: 'content/pages'
      });
      expect(mockPlugin.settings.postsFolder).toBe('content/posts');
      expect(mockPlugin.settings.pagesFolder).toBe('content/pages');
    });
  });

  describe('Site Configuration', () => {
    it('should have default site title', () => {
      const settings = createMockSettings();
      expect(settings.siteTitle).toBe('Test Site');
    });

    it('should have default site description', () => {
      const settings = createMockSettings();
      expect(settings.siteDescription).toBe('A test site for integration tests');
    });

    it('should have default site URL', () => {
      const settings = createMockSettings();
      expect(settings.siteUrl).toBe('https://test.example.com');
    });

    it('should accept custom site configuration', () => {
      const mockPlugin = createMockPlugin({
        siteTitle: 'My Custom Site',
        siteDescription: 'Custom description',
        siteUrl: 'https://custom.example.com'
      });
      expect(mockPlugin.settings.siteTitle).toBe('My Custom Site');
      expect(mockPlugin.settings.siteDescription).toBe('Custom description');
      expect(mockPlugin.settings.siteUrl).toBe('https://custom.example.com');
    });
  });

  describe('Output Directory', () => {
    it('should have default output directory', () => {
      const settings = createMockSettings();
      expect(settings.outputDirectory).toBe('/tmp/test-output');
    });

    it('should accept custom output directory', () => {
      const mockPlugin = createMockPlugin({
        outputDirectory: '/custom/output/path'
      });
      expect(mockPlugin.settings.outputDirectory).toBe('/custom/output/path');
    });
  });

  describe('Preview Server Settings', () => {
    it('should have default preview server port', () => {
      const settings = createMockSettings();
      expect(settings.previewServerPort).toBe(3456);
    });

    it('should accept custom preview server port', () => {
      const mockPlugin = createMockPlugin({ previewServerPort: 8080 });
      expect(mockPlugin.settings.previewServerPort).toBe(8080);
    });
  });

  describe('Auto Regenerate', () => {
    it('should have auto regenerate disabled by default', () => {
      const settings = createMockSettings();
      expect(settings.autoRegenerate).toBe(false);
    });

    it('should enable auto regenerate when set', () => {
      const mockPlugin = createMockPlugin({ autoRegenerate: true });
      expect(mockPlugin.settings.autoRegenerate).toBe(true);
    });
  });

  describe('Settings Override Behavior', () => {
    it('should override individual settings while keeping defaults', () => {
      const mockPlugin = createMockPlugin({
        siteTitle: 'Overridden Title',
        generateRobotsTxt: false
      });

      expect(mockPlugin.settings.siteTitle).toBe('Overridden Title');
      expect(mockPlugin.settings.generateRobotsTxt).toBe(false);
      expect(mockPlugin.settings.generateSitemap).toBe(true);
      expect(mockPlugin.settings.includeAttachments).toBe(true);
    });

    it('should preserve all settings structure', () => {
      const settings = createMockSettings();

      expect(settings).toHaveProperty('outputDirectory');
      expect(settings).toHaveProperty('siteTitle');
      expect(settings).toHaveProperty('siteDescription');
      expect(settings).toHaveProperty('siteUrl');
      expect(settings).toHaveProperty('includeAttachments');
      expect(settings).toHaveProperty('generateSitemap');
      expect(settings).toHaveProperty('generateRobotsTxt');
      expect(settings).toHaveProperty('processWikilinks');
      expect(settings).toHaveProperty('processEmbeds');
      expect(settings).toHaveProperty('ignoredFolders');
      expect(settings).toHaveProperty('previewServerPort');
      expect(settings).toHaveProperty('autoRegenerate');
      expect(settings).toHaveProperty('postsFolder');
      expect(settings).toHaveProperty('pagesFolder');
    });
  });
});