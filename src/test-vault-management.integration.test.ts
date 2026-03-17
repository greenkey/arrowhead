import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestVaultManager, createTemporaryDirectory, cleanupTemporaryDirectory } from './test-helpers';

describe('Test Vault Management Tests', () => {
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

  describe('Vault Setup', () => {
    it('should create vault directory structure', async () => {
      const vaultPath = vaultManager.getVaultPath();

      expect(fs.existsSync(path.join(vaultPath, 'posts'))).toBe(true);
      expect(fs.existsSync(path.join(vaultPath, 'pages'))).toBe(true);
      expect(fs.existsSync(path.join(vaultPath, 'assets'))).toBe(true);
    });

    it('should create output directory structure', async () => {
      const outputPath = vaultManager.getOutputPath();

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'assets'))).toBe(true);
    });

    it('should handle setup without errors', async () => {
      const newVaultManager = new TestVaultManager({
        vaultPath: fs.mkdtempSync('/tmp/arrowhead-fresh-'),
        outputPath: fs.mkdtempSync('/tmp/arrowhead-output-')
      });

      expect(() => newVaultManager.setup()).not.toThrow();
      await newVaultManager.cleanup();
    });
  });

  describe('Vault Cleanup', () => {
    it('should remove created files on cleanup', async () => {
      await vaultManager.createFile('pages/test.md', 'test content');
      await vaultManager.createFile('posts/test.md', 'test content');

      await vaultManager.cleanup();

      const pageExists = await vaultManager.fileExists('pages/test.md');
      const postExists = await vaultManager.fileExists('posts/test.md');

      expect(pageExists).toBe(false);
      expect(postExists).toBe(false);
    });

    it('should handle cleanup multiple times', async () => {
      await vaultManager.createFile('pages/test.md', 'content');

      await vaultManager.cleanup();
      await vaultManager.cleanup();

      const exists = await vaultManager.fileExists('pages/test.md');
      expect(exists).toBe(false);
    });

    it('should not throw on cleanup of non-existent files', async () => {
      expect(() => vaultManager.cleanup()).not.toThrow();
    });
  });

  describe('Temporary Directory Utilities', () => {
    it('should create temporary directory', async () => {
      const tmpDir = await createTemporaryDirectory();

      expect(fs.existsSync(tmpDir)).toBe(true);

      await cleanupTemporaryDirectory(tmpDir);
      expect(fs.existsSync(tmpDir)).toBe(false);
    });

    it('should cleanup temporary directory', async () => {
      const tmpDir = await createTemporaryDirectory();
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'content');

      await cleanupTemporaryDirectory(tmpDir);

      expect(fs.existsSync(tmpDir)).toBe(false);
    });

    it('should handle cleanup of non-existent directory', async () => {
      expect(() => cleanupTemporaryDirectory('/tmp/non-existent-dir-12345')).not.toThrow();
    });
  });

  describe('Multiple Vault Instances', () => {
    it('should manage multiple vault managers independently', async () => {
      const tmpDir1 = fs.mkdtempSync('/tmp/arrowhead-1-');
      const tmpDir2 = fs.mkdtempSync('/tmp/arrowhead-2-');

      const manager1 = new TestVaultManager({
        vaultPath: path.join(tmpDir1, 'vault'),
        outputPath: path.join(tmpDir1, 'output')
      });
      const manager2 = new TestVaultManager({
        vaultPath: path.join(tmpDir2, 'vault'),
        outputPath: path.join(tmpDir2, 'output')
      });

      await manager1.setup();
      await manager2.setup();

      await manager1.createFile('pages/page1.md', 'Content 1');
      await manager2.createFile('pages/page2.md', 'Content 2');

      const page1Exists = await manager1.fileExists('pages/page1.md');
      const page2Exists = await manager2.fileExists('pages/page2.md');
      const page1NotIn2 = !(await manager2.fileExists('pages/page1.md'));
      const page2NotIn1 = !(await manager1.fileExists('pages/page2.md'));

      expect(page1Exists).toBe(true);
      expect(page2Exists).toBe(true);
      expect(page1NotIn2).toBe(true);
      expect(page2NotIn1).toBe(true);

      await manager1.cleanup();
      await manager2.cleanup();

      fs.rmSync(tmpDir1, { recursive: true });
      fs.rmSync(tmpDir2, { recursive: true });
    });
  });

  describe('Vault Path Handling', () => {
    it('should return correct vault path', () => {
      const vaultPath = vaultManager.getVaultPath();
      expect(vaultPath).toBeTruthy();
      expect(typeof vaultPath).toBe('string');
    });

    it('should return correct output path', () => {
      const outputPath = vaultManager.getOutputPath();
      expect(outputPath).toBeTruthy();
      expect(typeof outputPath).toBe('string');
    });

    it('should return different paths for vault and output', () => {
      const vaultPath = vaultManager.getVaultPath();
      const outputPath = vaultManager.getOutputPath();

      expect(vaultPath).not.toBe(outputPath);
    });
  });

  describe('File Operations in Vault', () => {
    it('should create and verify pages', async () => {
      const content = `---
title: Page Test
date: 2026-03-10
---
# Page Test`;

      await vaultManager.createFile('pages/page-test.md', content);

      const exists = await vaultManager.fileExists('pages/page-test.md');
      const fileContent = await vaultManager.getFileContent('pages/page-test.md');

      expect(exists).toBe(true);
      expect(fileContent).toContain('Page Test');
    });

    it('should create and verify posts', async () => {
      const content = `---
title: Post Test
date: 2026-03-10
---
# Post Test`;

      await vaultManager.createFile('posts/post-test.md', content);

      const exists = await vaultManager.fileExists('posts/post-test.md');
      const fileContent = await vaultManager.getFileContent('posts/post-test.md');

      expect(exists).toBe(true);
      expect(fileContent).toContain('Post Test');
    });

    it('should create and verify assets', async () => {
      const content = 'fake-image-data';
      await vaultManager.createFile('assets/images/test.png', content);

      const exists = await vaultManager.fileExists('assets/images/test.png');
      expect(exists).toBe(true);
    });

    it('should handle batch file creation', async () => {
      const files = [
        { path: 'pages/batch1.md', content: '# Batch 1' },
        { path: 'pages/batch2.md', content: '# Batch 2' },
        { path: 'posts/batch1.md', content: '# Post 1' }
      ];

      await vaultManager.createFiles(files);

      for (const file of files) {
        const exists = await vaultManager.fileExists(file.path);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent file creation', async () => {
      const createPromises = [];
      for (let i = 0; i < 10; i++) {
        createPromises.push(
          vaultManager.createFile(`pages/concurrent-${i}.md`, `# Concurrent ${i}`)
        );
      }

      await Promise.all(createPromises);

      for (let i = 0; i < 10; i++) {
        const exists = await vaultManager.fileExists(`pages/concurrent-${i}.md`);
        expect(exists).toBe(true);
      }
    });

    it('should handle concurrent reads and writes', async () => {
      await vaultManager.createFile('pages/shared.md', 'Initial');

      const operations = [
        vaultManager.getFileContent('pages/shared.md'),
        vaultManager.fileExists('pages/shared.md'),
        vaultManager.createFile('pages/other.md', 'Other'),
        vaultManager.getFileContent('pages/shared.md')
      ];

      const results = await Promise.all(operations);

      expect(results[0]).toContain('Initial');
      expect(results[1]).toBe(true);
      expect(results[2]).toBeUndefined();
      expect(results[3]).toContain('Initial');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file read gracefully', async () => {
      const content = await vaultManager.getFileContent('pages/non-existent.md');
      expect(content).toBeUndefined();
    });

    it('should handle non-existent file check', async () => {
      const exists = await vaultManager.fileExists('pages/non-existent.md');
      expect(exists).toBe(false);
    });
  });
});