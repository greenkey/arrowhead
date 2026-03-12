import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { vi } from 'vitest';
import { VaultWalker, classifyFile, VaultData } from './utils/vault-walker';
import { MockVaultFile, createMockVaultFile, createMockVaultWithTestFiles, TestVaultFile } from './test/mocks';

describe('VaultWalker Integration Tests', () => {
  let tmpDir: string;
  let vaultPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-vault-walker-'));
    vaultPath = path.join(tmpDir, 'vault');
    fs.mkdirSync(vaultPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function createMockPluginWithFiles(files: TestVaultFile[]): any {
    const vault = createMockVaultWithTestFiles(files, vaultPath);

    const mockFiles = files.map(file =>
      createMockVaultFile({
        path: file.path,
        content: file.content,
        frontmatter: file.frontmatter
      })
    );

    vault.getAbstractFileByPath = vi.fn().mockImplementation((filePath: string) => {
      const found = mockFiles.find(f =>
        f.path === filePath ||
        f.path === filePath + '.md' ||
        f.path === filePath.replace(/\.md$/i, '') ||
        f.path === filePath.replace(/\.md$/i, '') + '.md'
      );
      return found || null;
    });

    return {
      settings: {
        outputDirectory: '/tmp/test-output',
        siteTitle: 'Test Site',
        siteDescription: 'Test',
        siteUrl: 'https://test.com',
        includeAttachments: true,
        generateSitemap: true,
        generateRobotsTxt: true,
        processWikilinks: true,
        processEmbeds: true,
        ignoredFolders: [],
        previewServerPort: 3000,
        autoRegenerate: false,
        postsFolder: 'posts',
        pagesFolder: 'pages'
      },
      app: {
        vault: vault,
        metadataCache: {
          getFileCache: vi.fn().mockImplementation((file: MockVaultFile) => {
            const testFile = files.find(f => f.path === file.path);
            return testFile?.frontmatter ? { frontmatter: testFile.frontmatter } : {};
          }),
          setCache: vi.fn(),
          getFrontmatter: vi.fn().mockReturnValue({})
        },
        workspace: {
          on: vi.fn(),
          off: vi.fn()
        }
      },
      getVaultRootPath: vi.fn().mockReturnValue(vaultPath)
    };
  }

  describe('File Classification', () => {
    it('should classify file in posts folder as post', () => {
      expect(classifyFile('posts/article.md', 'posts', 'pages')).toBe('post');
    });

    it('should classify file in pages folder as page', () => {
      expect(classifyFile('pages/about.md', 'posts', 'pages')).toBe('page');
    });

    it('should classify nested file in posts folder as post', () => {
      expect(classifyFile('posts/subfolder/article.md', 'posts', 'pages')).toBe('post');
    });

    it('should classify nested file in pages folder as page', () => {
      expect(classifyFile('pages/subfolder/about.md', 'posts', 'pages')).toBe('page');
    });

    it('should return null for file outside posts/pages folders', () => {
      expect(classifyFile('drafts/idea.md', 'posts', 'pages')).toBeNull();
    });

    it('should return null for file in ignored folder', () => {
      expect(classifyFile('.obsidian/settings.md', 'posts', 'pages')).toBeNull();
    });

    it('should handle custom folder names', () => {
      expect(classifyFile('blog/my-post.md', 'blog', 'docs')).toBe('post');
      expect(classifyFile('docs/about.md', 'blog', 'docs')).toBe('page');
    });
  });

  describe('Vault Data Collection', () => {
    it('should collect files from posts and pages folders', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/tutorial.md', content: '# Tutorial' },
        { path: 'pages/about.md', content: '# About' }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(2);
      expect(data.files.find(f => f.path === 'posts/tutorial.md')).toBeDefined();
      expect(data.files.find(f => f.path === 'pages/about.md')).toBeDefined();
    });

    it('should exclude files outside posts/pages folders', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/tutorial.md', content: '# Tutorial' },
        { path: 'drafts/idea.md', content: '# Draft Idea' },
        { path: 'pages/about.md', content: '# About' }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(2);
      expect(data.excludedFiles).toContain('drafts/idea.md');
    });

    it('should extract frontmatter from files', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---
title: My Tutorial
tags: [tutorial, guide]
date: 2026-03-10
---
# Tutorial Content`,
          frontmatter: { title: 'My Tutorial', tags: ['tutorial', 'guide'], date: '2026-03-10' }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(1);
      const file = data.files[0]!;
      expect(file.frontmatter.title).toBe('My Tutorial');
      expect(file.frontmatter.tags).toEqual(['tutorial', 'guide']);
    });

    it('should extract tags from frontmatter array', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---\ntags: [tutorial, guide, learning]\n---\nContent`,
          frontmatter: { tags: ['tutorial', 'guide', 'learning'] }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(1);
      const file = data.files[0]!;
      expect(file.tags).toContain('tutorial');
      expect(file.tags).toContain('guide');
      expect(file.tags).toContain('learning');
    });

    it('should extract tags from frontmatter string', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---\ntags: tutorial, guide, learning\n---\nContent`,
          frontmatter: { tags: 'tutorial, guide, learning' }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(1);
      const file = data.files[0]!;
      expect(file.tags).toContain('tutorial');
      expect(file.tags).toContain('guide');
      expect(file.tags).toContain('learning');
    });

    it('should extract inline tags from content', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `# Tutorial\n\nThis is about #javascript and #typescript development`,
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(1);
      const file = data.files[0]!;
      expect(file.tags).toContain('javascript');
      expect(file.tags).toContain('typescript');
    });

    it('should combine frontmatter and inline tags', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---\ntags: [frontmatter-tag]\n---\nContent with #inline-tag`,
          frontmatter: { tags: ['frontmatter-tag'] }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.tags).toContain('frontmatter-tag');
      expect(file.tags).toContain('inline-tag');
    });

    it('should deduplicate tags', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---\ntags: [tutorial, tutorial]\n---\n#tutorial content`,
          frontmatter: { tags: ['tutorial', 'tutorial'] }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      const tags = file.tags;
      const tutorialCount = tags.filter(t => t === 'tutorial').length;
      expect(tutorialCount).toBe(1);
    });

    it('should extract wikilinks from content', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: `See [[other-page]] for details or [[posts/tutorial|Tutorial]]`,
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.links).toHaveLength(2);
      expect(file.links[0]!.target).toBe('other-page');
      expect(file.links[0]!.type).toBe('wiki');
      expect(file.links[1]!.target).toBe('posts/tutorial');
      expect(file.links[1]!.displayText).toBe('Tutorial');
    });

    it('should extract markdown links from content', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: `[External](https://example.com) and [Asset](image.png)`,
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.links).toHaveLength(2);
      expect(file.links[0]!.target).toBe('https://example.com');
      expect(file.links[0]!.type).toBe('url');
      expect(file.links[1]!.target).toBe('image.png');
      expect(file.links[1]!.type).toBe('asset');
    });

    it('should extract embeds from content', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: `![[embedded-image.jpg]] and ![[another-page]]`,
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.embeds).toContain('embedded-image.jpg');
      expect(file.embeds).toContain('another-page');
    });

    it('should ignore file:// and anchor links', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: `[File](file://path/to/file) and [Anchor](#section)`,
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.links).toHaveLength(0);
    });

    it('should organize files by tags in VaultData', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `# Tutorial\n#tutorial`,
          frontmatter: { tags: ['tutorial'] }
        },
        {
          path: 'posts/guide.md',
          content: `# Guide\n#guide`,
          frontmatter: { tags: ['guide'] }
        },
        {
          path: 'posts/tips.md',
          content: `# Tips\n#tips`,
          frontmatter: { tags: ['tips', 'tutorial'] }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.tags.has('tutorial')).toBe(true);
      expect(data.tags.get('tutorial')).toHaveLength(2);
      expect(data.tags.has('guide')).toBe(true);
      expect(data.tags.get('guide')).toHaveLength(1);
    });

    it('should calculate total size', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/post1.md', content: '12345', frontmatter: {} },
        { path: 'posts/post2.md', content: '67890', frontmatter: {} }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.totalSize).toBe(10);
    });

    it('should track excluded files', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/tutorial.md', content: 'Content', frontmatter: {} },
        { path: 'drafts/idea.md', content: 'Draft', frontmatter: {} },
        { path: '.obsidian/config.md', content: 'Config', frontmatter: {} }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.excludedFiles).toContain('drafts/idea.md');
      expect(data.excludedFiles).toContain('.obsidian/config.md');
    });

    it('should respect ignoredFolders setting', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/tutorial.md', content: 'Content', frontmatter: {} },
        { path: 'templates/template.md', content: 'Template', frontmatter: {} },
        { path: 'pages/about.md', content: 'About', frontmatter: {} }
      ];

      const plugin = createMockPluginWithFiles(files);
      plugin.settings.ignoredFolders = ['templates'];
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(2);
      expect(data.excludedFiles).toContain('templates/template.md');
    });

    it('should handle empty vault', async () => {
      const files: TestVaultFile[] = [];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(0);
      expect(data.tags.size).toBe(0);
      expect(data.links).toHaveLength(0);
    });

    it('should handle files with no frontmatter', async () => {
      const files: TestVaultFile[] = [
        { path: 'posts/simple.md', content: 'Just content\n#tag', frontmatter: undefined }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      expect(data.files).toHaveLength(1);
      const file = data.files[0]!;
      expect(file.frontmatter).toEqual({});
      expect(file.tags).toContain('tag');
    });

    it('should extract mattermost date from frontmatter', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---
date: 2026-03-10
---
Content`,
          frontmatter: { date: '2026-03-10' }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.mattermost).toBeDefined();
      expect(file.mattermost?.date).toBe('2026-03-10');
    });

    it('should not add mattermost when no date in frontmatter', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'posts/tutorial.md',
          content: `---
title: No Date
---
Content`,
          frontmatter: { title: 'No Date' }
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      expect(file.mattermost).toBeUndefined();
    });
  });

  describe('Link Type Resolution', () => {
    it('should resolve wikilink to internal when target exists', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: 'See [[other-page]]',  // Relative wikilink - resolves from same folder
          frontmatter: {}
        },
        {
          path: 'pages/other-page.md',    // Target in the same folder
          content: 'Other page content',
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const link = data.links.find(l => l.source === 'pages/about.md' && l.target === 'other-page');
      expect(link).toBeDefined();
      expect(link?.type).toBe('internal');
    });

    it('should mark wikilink as broken when target does not exist', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: 'See [[nonexistent-page]]',
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const link = data.links.find(l => l.source === 'pages/about.md' && l.target === 'nonexistent-page');
      expect(link).toBeDefined();
      expect(link?.type).toBe('broken');
    });

    it('should track external URL links in file data', async () => {
      const files: TestVaultFile[] = [
        {
          path: 'pages/about.md',
          content: 'Visit [Google](https://google.com)',
          frontmatter: {}
        }
      ];

      const plugin = createMockPluginWithFiles(files);
      const walker = new VaultWalker(plugin);
      const data = await walker.collectVaultData();

      const file = data.files[0]!;
      const urlLink = file.links.find(l => l.type === 'url');
      expect(urlLink).toBeDefined();
      expect(urlLink?.target).toBe('https://google.com');
      expect(urlLink?.type).toBe('url');
    });
  });
});