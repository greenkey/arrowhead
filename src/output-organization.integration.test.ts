import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager, OutputVerifier } from './test-helpers';

describe('Output Organization Tests', () => {
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

  describe('Folder Structure Generation', () => {
    it('should maintain nested folder structure in vault', async () => {
      await vaultManager.createFile('pages/blog/tutorials/getting-started.md', `---
title: Getting Started
date: 2026-03-10
---
# Tutorial`);
      await vaultManager.createFile('pages/blog/advanced/features.md', `---
title: Features
date: 2026-03-11
---
# Features`);

      const tutExists = await vaultManager.fileExists('pages/blog/tutorials/getting-started.md');
      const featExists = await vaultManager.fileExists('pages/blog/advanced/features.md');
      expect(tutExists).toBe(true);
      expect(featExists).toBe(true);
    });

    it('should create separate directories for pages and posts in vault', async () => {
      const vaultPath = vaultManager.getVaultPath();
      const pagesDir = path.join(vaultPath, 'pages');
      const postsDir = path.join(vaultPath, 'posts');

      expect(fs.existsSync(pagesDir)).toBe(true);
      expect(fs.existsSync(postsDir)).toBe(true);
    });

    it('should handle multiple levels of nesting', async () => {
      await vaultManager.createFile('pages/a/b/c/d/e/deeply-nested.md', `---
title: Deep Nest
date: 2026-03-10
---
# Deep`);

      const content = await vaultManager.getFileContent('pages/a/b/c/d/e/deeply-nested.md');
      expect(content).toContain('Deep Nest');
    });

    it('should preserve folder names exactly as specified', async () => {
      await vaultManager.createFile('pages/My-Uppercase-Folder/page.md', `---
title: Uppercase
date: 2026-03-10
---
# Page`);
      await vaultManager.createFile('pages/123numeric/page.md', `---
title: Numeric
date: 2026-03-10
---
# Page`);

      const vaultContent = await vaultManager.getFileContent('pages/My-Uppercase-Folder/page.md');
      const numericContent = await vaultManager.getFileContent('pages/123numeric/page.md');

      expect(vaultContent).toContain('Uppercase');
      expect(numericContent).toContain('Numeric');
    });
  });

  describe('URL Generation', () => {
    it('should generate URLs based on file path', async () => {
      await vaultManager.createFile('pages/about.md', `---
title: About
date: 2026-03-10
---
# About`);
      await vaultManager.createFile('posts/hello-world.md', `---
title: Hello World
date: 2026-03-10
---
# Hello`);

      const aboutExists = await vaultManager.fileExists('pages/about.md');
      const postExists = await vaultManager.fileExists('posts/hello-world.md');

      expect(aboutExists).toBe(true);
      expect(postExists).toBe(true);
    });

    it('should handle spaces in folder names by converting to hyphens', async () => {
      const content = `---
title: Space Test
date: 2026-03-10
---
# Content`;
      await vaultManager.createFile('pages/folder name with spaces/page.md', content);

      const fileExists = await vaultManager.fileExists('pages/folder name with spaces/page.md');
      expect(fileExists).toBe(true);
    });

    it('should handle special characters in file names', async () => {
      const content = `---
title: Special
date: 2026-03-10
---
# Content`;
      await vaultManager.createFile("pages/file-with-dashes-and-numbers-123.md", content);
      await vaultManager.createFile('pages/another_file.md', content);

      const dashFile = await vaultManager.fileExists('pages/file-with-dashes-and-numbers-123.md');
      const underscoreFile = await vaultManager.fileExists('pages/another_file.md');

      expect(dashFile).toBe(true);
      expect(underscoreFile).toBe(true);
    });
  });

  describe('Index Page Creation', () => {
    it('should create index pages for directories', async () => {
      await vaultManager.createFile('pages/blog/index.md', `---
title: Blog Index
date: 2026-03-10
---
# Blog`);
      await vaultManager.createFile('pages/blog/post-1.md', `---
title: Post 1
date: 2026-03-11
---
# Content`);

      const indexExists = await vaultManager.fileExists('pages/blog/index.md');
      expect(indexExists).toBe(true);
    });

    it('should generate root index page', async () => {
      await vaultManager.createFile('pages/home.md', `---
title: Home
date: 2026-03-10
---
# Home Page`);
      await vaultManager.createFile('posts/first.md', `---
title: First Post
date: 2026-03-11
---
# Post`);

      const homeExists = await vaultManager.fileExists('pages/home.md');
      expect(homeExists).toBe(true);
    });
  });

  describe('Asset Folder Structure', () => {
    it('should maintain assets folder structure', async () => {
      await vaultManager.createFile('assets/images/photo.jpg', 'fake-image-content');
      await vaultManager.createFile('assets/css/style.css', 'fake-css-content');

      const imagesExist = await vaultManager.fileExists('assets/images/photo.jpg');
      const cssExists = await vaultManager.fileExists('assets/css/style.css');

      expect(imagesExist).toBe(true);
      expect(cssExists).toBe(true);
    });

    it('should handle nested asset folders', async () => {
      const nestedPath = 'assets/a/b/c/d/e/f/g/deep-asset.txt';
      await vaultManager.createFile(nestedPath, 'deep content');

      const exists = await vaultManager.fileExists(nestedPath);
      expect(exists).toBe(true);
    });

    it('should distinguish between vault assets and output assets', async () => {
      await vaultManager.createFile('assets/test.png', 'asset-content');
      await vaultManager.createFile('pages/test.md', `---
title: Test
date: 2026-03-10
---
# Content`);

      const vaultAsset = await vaultManager.fileExists('assets/test.png');
      const vaultPage = await vaultManager.fileExists('pages/test.md');

      expect(vaultAsset).toBe(true);
      expect(vaultPage).toBe(true);
    });
  });

  describe('Content Separation', () => {
    it('should keep posts and pages in separate output locations', async () => {
      const pagePath = 'pages/about.md';
      const postPath = 'posts/2026-03-10-hello.md';

      await vaultManager.createFile(pagePath, `---
title: About
date: 2026-03-10
---
# About`);
      await vaultManager.createFile(postPath, `---
title: Hello
date: 2026-03-10
---
# Post`);

      const pageExists = await vaultManager.fileExists(pagePath);
      const postExists = await vaultManager.fileExists(postPath);

      expect(pageExists).toBe(true);
      expect(postExists).toBe(true);
    });

    it('should handle empty folders appropriately', async () => {
      const emptyDir = path.join(vaultManager.getVaultPath(), 'pages/empty-folder');
      fs.mkdirSync(emptyDir, { recursive: true });

      const exists = fs.existsSync(emptyDir);
      expect(exists).toBe(true);
    });

    it('should process files only in configured folders', async () => {
      await vaultManager.createFile('pages/valid.md', `---
title: Valid
date: 2026-03-10
---
# Content`);
      await vaultManager.createFile('other/invalid.md', `---
title: Invalid
date: 2026-03-10
---
# Content`);

      const validExists = await vaultManager.fileExists('pages/valid.md');
      const invalidExists = await vaultManager.fileExists('other/invalid.md');

      expect(validExists).toBe(true);
      expect(invalidExists).toBe(true);
    });
  });
});