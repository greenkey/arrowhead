import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Clear Output Directory Tests', () => {
  describe('FileSystem Clearing (outside vault)', () => {
    it('should remove all files from output directory', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');
      fs.mkdirSync(outputPath, { recursive: true });

      fs.writeFileSync(path.join(outputPath, 'file1.html'), 'content1');
      fs.writeFileSync(path.join(outputPath, 'file2.html'), 'content2');
      fs.writeFileSync(path.join(outputPath, 'file3.html'), 'content3');

      expect(fs.existsSync(path.join(outputPath, 'file1.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'file2.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'file3.html'))).toBe(true);

      await clearOutputDirectoryWithFs(outputPath);

      expect(fs.existsSync(path.join(outputPath, 'file1.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'file2.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'file3.html'))).toBe(false);
      expect(fs.existsSync(outputPath)).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should remove subdirectories and their contents', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');
      fs.mkdirSync(path.join(outputPath, 'subdir1', 'nested'), { recursive: true });
      fs.mkdirSync(path.join(outputPath, 'subdir2'), { recursive: true });

      fs.writeFileSync(path.join(outputPath, 'root-file.html'), 'root');
      fs.writeFileSync(path.join(outputPath, 'subdir1', 'file.html'), 'content');
      fs.writeFileSync(path.join(outputPath, 'subdir1', 'nested', 'deep-file.html'), 'deep');
      fs.writeFileSync(path.join(outputPath, 'subdir2', 'another.html'), 'another');

      await clearOutputDirectoryWithFs(outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'root-file.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'subdir1'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'subdir2'))).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle empty directory gracefully', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'empty-output');
      fs.mkdirSync(outputPath, { recursive: true });

      await clearOutputDirectoryWithFs(outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle non-existent directory gracefully', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'non-existent');

      await clearOutputDirectoryWithFs(outputPath);

      expect(fs.existsSync(outputPath)).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should preserve the output directory itself', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');
      fs.mkdirSync(outputPath, { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'file.html'), 'content');

      await clearOutputDirectoryWithFs(outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.readdirSync(outputPath).length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('Mixed Content', () => {
    it('should remove files with different extensions', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');
      fs.mkdirSync(outputPath, { recursive: true });

      fs.writeFileSync(path.join(outputPath, 'index.html'), 'html');
      fs.writeFileSync(path.join(outputPath, 'style.css'), 'css');
      fs.writeFileSync(path.join(outputPath, 'script.js'), 'js');
      fs.writeFileSync(path.join(outputPath, 'data.json'), 'json');

      await clearOutputDirectoryWithFs(outputPath);

      const remaining = fs.readdirSync(outputPath);
      expect(remaining.length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle files with special characters in names', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const outputPath = path.join(tmpDir, 'output');
      fs.mkdirSync(outputPath, { recursive: true });

      fs.writeFileSync(path.join(outputPath, 'file with spaces.html'), 'content');
      fs.writeFileSync(path.join(outputPath, 'file-with-dashes.html'), 'content');
      fs.writeFileSync(path.join(outputPath, 'file_with_underscores.html'), 'content');

      await clearOutputDirectoryWithFs(outputPath);

      const remaining = fs.readdirSync(outputPath);
      expect(remaining.length).toBe(0);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});

async function clearOutputDirectoryWithFs(outputPath: string): Promise<void> {
  try {
    if (fs.existsSync(outputPath)) {
      const files = fs.readdirSync(outputPath);
      for (const file of files) {
        const filePath = path.join(outputPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (error) {
    console.warn('[clearOutputDirectory] Failed:', error);
  }
}