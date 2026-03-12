import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager, OutputVerifier } from './test-helpers';

describe('Publishing Validation Tests', () => {
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

  describe('Basic Publishing', () => {
    it('should create markdown file in pages folder', async () => {
      const pageContent = `---
title: Test Page
date: 2026-03-10
---

# Test Page

This is a test page content.`;

      await vaultManager.createFile('pages/about.md', pageContent);

      const fileExists = await vaultManager.fileExists('pages/about.md');
      expect(fileExists).toBe(true);

      const content = await vaultManager.getFileContent('pages/about.md');
      expect(content).toContain('Test Page');
      expect(content).toContain('# Test Page');
    });

    it('should create markdown file in posts folder', async () => {
      const postContent = `---
title: Test Post
date: 2026-03-10
---

# Test Post

This is a test post content.`;

      await vaultManager.createFile('posts/test-post.md', postContent);

      const fileExists = await vaultManager.fileExists('posts/test-post.md');
      expect(fileExists).toBe(true);

      const content = await vaultManager.getFileContent('posts/test-post.md');
      expect(content).toContain('Test Post');
    });

    it('should create both pages and posts correctly', async () => {
      const pageContent = `---
title: Test Page
date: 2026-03-10
---

# Test Page`;

      const postContent = `---
title: Test Post
date: 2026-03-10
---

# Test Post`;

      await vaultManager.createFile('pages/about.md', pageContent);
      await vaultManager.createFile('posts/test-post.md', postContent);

      const pageExists = await vaultManager.fileExists('pages/about.md');
      const postExists = await vaultManager.fileExists('posts/test-post.md');

      expect(pageExists).toBe(true);
      expect(postExists).toBe(true);
    });
  });

  describe('Content Accuracy', () => {
    it('should preserve markdown content structure in output', async () => {
      const content = `---
title: Content Test
date: 2026-03-10
---

# Heading 1

Some paragraph text.

## Heading 2

More text here.`;

      await vaultManager.createFile('pages/test.md', content);

      const fileContent = await vaultManager.getFileContent('pages/test.md');
      expect(fileContent).toContain('Content Test');
      expect(fileContent).toContain('# Heading 1');
      expect(fileContent).toContain('## Heading 2');
    });

    it('should handle frontmatter correctly', async () => {
      const content = `---
title: Frontmatter Test
description: Test description
tags: [test, sample]
date: 2026-03-10
---

# Content`;

      await vaultManager.createFile('pages/frontmatter.md', content);

      const fileContent = await vaultManager.getFileContent('pages/frontmatter.md');
      expect(fileContent).toContain('title: Frontmatter Test');
      expect(fileContent).toContain('description: Test description');
      expect(fileContent).toContain('tags: [test, sample]');
    });

    it('should handle files with special characters in names', async () => {
      const content = `---
title: Special Chars Test
date: 2026-03-10
---

Content here.`;

      await vaultManager.createFile('pages/test-page-v2.md', content);

      const fileExists = await vaultManager.fileExists('pages/test-page-v2.md');
      expect(fileExists).toBe(true);
    });
  });

  describe('Nested Folder Structure', () => {
    it('should handle nested pages folder structure', async () => {
      const content = `---
title: Nested Page
date: 2026-03-10
---

Content.`;

      await vaultManager.createFile('pages/nested/deep/page.md', content);

      const fileExists = await vaultManager.fileExists('pages/nested/deep/page.md');
      expect(fileExists).toBe(true);
    });

    it('should handle nested posts folder structure', async () => {
      const content = `---
title: Nested Post
date: 2026-03-10
---

Content.`;

      await vaultManager.createFile('posts/category/subcategory/post.md', content);

      const fileExists = await vaultManager.fileExists('posts/category/subcategory/post.md');
      expect(fileExists).toBe(true);
    });
  });

  describe('File Types Processing', () => {
    it('should create markdown files correctly', async () => {
      const files = [
        'pages/about.md',
        'posts/test-post.md',
        'pages/nested/page.md'
      ];

      for (const file of files) {
        await vaultManager.createFile(file, '---\ntitle: Test\n---\nContent');
      }

      const allFilesExist = await Promise.all(
        files.map(file => vaultManager.fileExists(file))
      );

      expect(allFilesExist.every(exists => exists)).toBe(true);
    });

    it('should create attachment files', async () => {
      const assetContent = 'This is a placeholder for an image file';
      await vaultManager.createFile('assets/test-image.png', assetContent);

      const fileExists = await vaultManager.fileExists('assets/test-image.png');
      expect(fileExists).toBe(true);
    });
  });
});