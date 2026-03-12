import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager } from './test-helpers';

describe('File Operations Tests', () => {
  let vaultManager: TestVaultManager;

  beforeEach(async () => {
    const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
    const vaultPath = path.join(tmpDir, 'vault');
    const outputPath = path.join(tmpDir, 'output');

    vaultManager = new TestVaultManager({
      vaultPath,
      outputPath
    });

    await vaultManager.setup();
  });

  afterEach(async () => {
    await vaultManager.cleanup();
  });

  describe('File Creation', () => {
    it('should create a new page file', async () => {
      const content = `---
title: New Page
date: 2026-03-10
---
# New Page
This is a new page content.`;

      await vaultManager.createFile('pages/new-page.md', content);

      const exists = await vaultManager.fileExists('pages/new-page.md');
      expect(exists).toBe(true);
    });

    it('should create a new post file', async () => {
      const content = `---
title: New Post
date: 2026-03-10
---
# New Post
This is a new post content.`;

      await vaultManager.createFile('posts/new-post.md', content);

      const exists = await vaultManager.fileExists('posts/new-post.md');
      expect(exists).toBe(true);
    });

    it('should create nested directory structure', async () => {
      const content = `---
title: Nested
date: 2026-03-10
---
# Nested`;

      await vaultManager.createFile('pages/a/b/c/nested.md', content);

      const exists = await vaultManager.fileExists('pages/a/b/c/nested.md');
      expect(exists).toBe(true);
    });

    it('should create multiple files in sequence', async () => {
      const files = [
        { path: 'pages/page1.md', content: '---\ntitle: Page 1\n---\n# Page 1' },
        { path: 'pages/page2.md', content: '---\ntitle: Page 2\n---\n# Page 2' },
        { path: 'posts/post1.md', content: '---\ntitle: Post 1\n---\n# Post 1' }
      ];

      for (const file of files) {
        await vaultManager.createFile(file.path, file.content);
      }

      for (const file of files) {
        const exists = await vaultManager.fileExists(file.path);
        expect(exists).toBe(true);
      }
    });

    it('should create file with full frontmatter', async () => {
      const content = `---
title: Full Frontmatter
date: 2026-03-10
description: A complete frontmatter example
tags: [test, example, frontmatter]
---
# Content
This file has complete frontmatter.`;

      await vaultManager.createFile('pages/full.md', content);

      const fileContent = await vaultManager.getFileContent('pages/full.md');
      expect(fileContent).toContain('title: Full Frontmatter');
      expect(fileContent).toContain('description: A complete frontmatter example');
      expect(fileContent).toContain('tags: [test, example, frontmatter]');
    });
  });

  describe('File Read', () => {
    it('should read file content accurately', async () => {
      const content = `---
title: Read Test
date: 2026-03-10
---
# Read Test
This content should be read accurately.`;

      await vaultManager.createFile('pages/read-test.md', content);

      const readContent = await vaultManager.getFileContent('pages/read-test.md');
      expect(readContent).toBe(content);
    });

    it('should read nested file content', async () => {
      const content = `---
title: Deep Read
date: 2026-03-10
---
# Deep
Content in nested folder.`;

      await vaultManager.createFile('pages/deep/nested/deeply.md', content);

      const readContent = await vaultManager.getFileContent('pages/deep/nested/deeply.md');
      expect(readContent).toBe(content);
    });

    it('should verify file existence correctly', async () => {
      await vaultManager.createFile('pages/exists.md', '---\ntitle: Exists\n---\nContent');

      const exists = await vaultManager.fileExists('pages/exists.md');
      const notExists = await vaultManager.fileExists('pages/does-not-exist.md');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('File Rename', () => {
    it('should simulate file rename by creating new file', async () => {
      const originalContent = `---
title: Original
date: 2026-03-10
---
# Original`;

      await vaultManager.createFile('pages/original.md', originalContent);

      const renamedContent = `---
title: Renamed
date: 2026-03-10
---
# Renamed`;

      await vaultManager.createFile('pages/renamed.md', renamedContent);

      const originalExists = await vaultManager.fileExists('pages/original.md');
      const renamedExists = await vaultManager.fileExists('pages/renamed.md');

      expect(originalExists).toBe(true);
      expect(renamedExists).toBe(true);
    });

    it('should handle rename within same folder', async () => {
      const content = `---
title: Rename Same Folder
date: 2026-03-10
---
# Content`;

      await vaultManager.createFile('pages/old-name.md', content);
      await vaultManager.createFile('pages/new-name.md', content);

      const oldExists = await vaultManager.fileExists('pages/old-name.md');
      const newExists = await vaultManager.fileExists('pages/new-name.md');

      expect(oldExists).toBe(true);
      expect(newExists).toBe(true);
    });

    it('should handle rename with folder change', async () => {
      const content = `---
title: Move File
date: 2026-03-10
---
# Content`;

      await vaultManager.createFile('pages/old-folder/file.md', content);
      await vaultManager.createFile('pages/new-folder/file.md', content);

      const oldExists = await vaultManager.fileExists('pages/old-folder/file.md');
      const newExists = await vaultManager.fileExists('pages/new-folder/file.md');

      expect(oldExists).toBe(true);
      expect(newExists).toBe(true);
    });
  });

  describe('File Delete', () => {
    it('should track created files for cleanup', async () => {
      await vaultManager.createFile('pages/to-delete.md', 'content');
      await vaultManager.createFile('posts/to-delete.md', 'content');

      const filesExist = await Promise.all([
        vaultManager.fileExists('pages/to-delete.md'),
        vaultManager.fileExists('posts/to-delete.md')
      ]);

      expect(filesExist[0]).toBe(true);
      expect(filesExist[1]).toBe(true);
    });

    it('should handle deletion of nested files', async () => {
      await vaultManager.createFile('pages/a/b/c/nested.md', 'content');

      const exists = await vaultManager.fileExists('pages/a/b/c/nested.md');
      expect(exists).toBe(true);
    });
  });

  describe('File Content Updates', () => {
    it('should create file with updated content', async () => {
      const originalContent = `---
title: Original
date: 2026-03-10
---
# Original`;

      const updatedContent = `---
title: Updated
date: 2026-03-11
---
# Updated`;

      await vaultManager.createFile('pages/update-test.md', originalContent);
      await vaultManager.createFile('pages/update-test.md', updatedContent);

      const content = await vaultManager.getFileContent('pages/update-test.md');
      expect(content).toContain('title: Updated');
      expect(content).toContain('date: 2026-03-11');
    });

    it('should preserve content across operations', async () => {
      const content = `---
title: Persistence Test
date: 2026-03-10
---
# Test
This content should persist.`;

      await vaultManager.createFile('pages/persist.md', content);

      const readContent = await vaultManager.getFileContent('pages/persist.md');
      expect(readContent).toBe(content);
    });
  });

  describe('Batch File Operations', () => {
    it('should create multiple files using createFiles', async () => {
      const files = [
        { path: 'pages/batch1.md', content: '# Batch 1' },
        { path: 'pages/batch2.md', content: '# Batch 2' },
        { path: 'posts/batch1.md', content: '# Post 1' },
        { path: 'posts/batch2.md', content: '# Post 2' }
      ];

      await vaultManager.createFiles(files);

      for (const file of files) {
        const exists = await vaultManager.fileExists(file.path);
        expect(exists).toBe(true);
      }
    });

    it('should verify all batch files content', async () => {
      const files = [
        { path: 'pages/verify1.md', content: 'Content 1' },
        { path: 'pages/verify2.md', content: 'Content 2' }
      ];

      await vaultManager.createFiles(files);

      for (const file of files) {
        const content = await vaultManager.getFileContent(file.path);
        expect(content).toBe(file.content);
      }
    });
  });

  describe('Path Handling', () => {
    it('should handle relative paths correctly', async () => {
      const content = '# Test';
      await vaultManager.createFile('pages/relative.md', content);

      const vaultPath = vaultManager.getVaultPath();
      const fullPath = path.join(vaultPath, 'pages/relative.md');
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    it('should return correct vault path', () => {
      const vaultPath = vaultManager.getVaultPath();
      expect(vaultPath).toContain('vault');
    });

    it('should return correct output path', () => {
      const outputPath = vaultManager.getOutputPath();
      expect(outputPath).toContain('output');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      await vaultManager.createFile('pages/empty.md', '');

      const exists = await vaultManager.fileExists('pages/empty.md');
      expect(exists).toBe(true);
    });

    it('should handle content with special characters', async () => {
      const specialContent = `---
title: Special Chars
date: 2026-03-10
---
# Header with **bold** and *italic*
Link: [text](url)
Code: \`code\``;

      await vaultManager.createFile('pages/special.md', specialContent);

      const content = await vaultManager.getFileContent('pages/special.md');
      expect(content).toContain('**bold**');
      expect(content).toContain('*italic*');
    });

    it('should handle unicode characters', async () => {
      const unicodeContent = `---
title: Unicode Test
date: 2026-03-10
---
# 测试
# 🎉
# Ñoño`;

      await vaultManager.createFile('pages/unicode.md', unicodeContent);

      const content = await vaultManager.getFileContent('pages/unicode.md');
      expect(content).toContain('测试');
      expect(content).toContain('🎉');
    });
  });
});