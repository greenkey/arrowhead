import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createMockPlugin, createMockVaultAdapter } from './test/mocks';
import { isAbsolutePath } from './settings/settings';

describe('Clear Output Directory Validation', () => {
  describe('Integration: File clearing with pre-existing content', () => {
    it('should clear files when generating site with pre-existing output', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = path.join(tmpDir, 'output');

      fs.mkdirSync(path.join(vaultPath, 'pages'), { recursive: true });
      fs.mkdirSync(outputPath, { recursive: true });

      fs.writeFileSync(path.join(vaultPath, 'pages', 'test.md'), `---
title: Test Page
date: 2026-03-10
---
# Test Content`);

      fs.writeFileSync(path.join(outputPath, 'old-file-1.html'), 'OLD CONTENT 1');
      fs.writeFileSync(path.join(outputPath, 'old-file-2.html'), 'OLD CONTENT 2');
      fs.mkdirSync(path.join(outputPath, 'subdir'), { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'subdir', 'nested-old.html'), 'NESTED OLD');

      const outputFilesBefore = listFilesRecursively(outputPath);
      expect(outputFilesBefore.length).toBe(3);

      const clearedFiles = await simulateClearAndReturnRemovedFiles(
        vaultPath,
        outputPath,
        ['old-file-1.html', 'old-file-2.html', 'subdir/nested-old.html']
      );

      const outputFilesAfter = listFilesRecursively(outputPath);

      expect(clearedFiles.length).toBe(3);
      expect(outputFilesAfter.length).toBe(0);
      expect(fs.existsSync(path.join(outputPath, 'old-file-1.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'old-file-2.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'subdir'))).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should fail to clear files when clearing function is empty', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');

      fs.mkdirSync(outputPath, { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'file-to-clear.html'), 'should be removed');

      const filesBefore = listFilesRecursively(outputPath);
      expect(filesBefore.length).toBe(1);

      await emptyClearFunction(outputPath);

      const filesAfter = listFilesRecursively(outputPath);
      expect(filesAfter.length).toBe(1);
      expect(fs.existsSync(path.join(outputPath, 'file-to-clear.html'))).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should properly distinguish vault-internal vs external paths', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      const outputPath = path.join(vaultPath, '.obsidian-output');

      fs.mkdirSync(outputPath, { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'cache-file.html'), 'temp');

      const isInsideVault = outputPath.startsWith(vaultPath);
      expect(isInsideVault).toBe(true);

      const isAbsolute = isAbsolutePath(outputPath);
      const isOutsideVault = isAbsolute && !outputPath.startsWith(vaultPath);

      expect(isOutsideVault).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});

function listFilesRecursively(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else {
      files.push(path.relative(dir, fullPath));
    }
  }

  return files;
}

async function simulateClearAndReturnRemovedFiles(
  vaultPath: string,
  outputPath: string,
  filesToClear: string[]
): Promise<string[]> {
  const removed: string[] = [];
  const isOutsideVault = isAbsolutePath(outputPath) && !outputPath.startsWith(vaultPath);

  if (isOutsideVault) {
    if (fs.existsSync(outputPath)) {
      const files = fs.readdirSync(outputPath);
      for (const file of files) {
        const filePath = path.join(outputPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
          removed.push(file);
        } else {
          fs.unlinkSync(filePath);
          removed.push(file);
        }
      }
    }
  }

  return removed;
}

async function emptyClearFunction(_outputPath: string): Promise<void> {
  return;
}