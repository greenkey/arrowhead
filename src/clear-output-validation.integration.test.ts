import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SiteGenerator } from './generators/site-generator';
import { VaultData } from './utils/vault-walker';
import { isAbsolutePath } from './settings/settings';
import { vi } from 'vitest';

describe('SiteGenerator.clearOutputDirectory Tests', () => {
  describe('Using actual SiteGenerator.clearOutputDirectory method', () => {
    it('should clear files when called with absolute path outside vault', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = path.join(tmpDir, 'output');

      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(outputPath, { recursive: true });

      fs.writeFileSync(path.join(outputPath, 'old-file-1.html'), 'OLD 1');
      fs.writeFileSync(path.join(outputPath, 'old-file-2.html'), 'OLD 2');
      fs.mkdirSync(path.join(outputPath, 'subdir'), { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'subdir', 'nested.html'), 'NESTED');

      expect(fs.existsSync(path.join(outputPath, 'old-file-1.html'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'subdir'))).toBe(true);

      const mockPlugin = createMockPluginWithPaths(vaultPath, outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      await (generator as any).clearOutputDirectory(outputPath);

      expect(fs.existsSync(path.join(outputPath, 'old-file-1.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'old-file-2.html'))).toBe(false);
      expect(fs.existsSync(path.join(outputPath, 'subdir'))).toBe(false);
      expect(fs.existsSync(outputPath)).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should clear files inside vault-relative path', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = 'output';

      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(path.join(vaultPath, outputPath), { recursive: true });

      fs.writeFileSync(path.join(vaultPath, outputPath, 'file.html'), 'OLD');
      fs.writeFileSync(path.join(vaultPath, outputPath, 'another.html'), 'ANOTHER');

      expect(fs.existsSync(path.join(vaultPath, outputPath, 'file.html'))).toBe(true);

      const mockPlugin = createMockPluginWithPaths(vaultPath, path.join(vaultPath, outputPath));
      const generator = new SiteGenerator(mockPlugin as any);

      await (generator as any).clearOutputDirectory(outputPath);

      expect(fs.existsSync(path.join(vaultPath, outputPath, 'file.html'))).toBe(false);
      expect(fs.existsSync(path.join(vaultPath, outputPath, 'another.html'))).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle non-existent directory', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = path.join(tmpDir, 'non-existent');

      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createMockPluginWithPaths(vaultPath, outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      await expect((generator as any).clearOutputDirectory(outputPath)).resolves.not.toThrow();

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle empty directory', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = path.join(tmpDir, 'output');

      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(outputPath, { recursive: true });

      const mockPlugin = createMockPluginWithPaths(vaultPath, outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      await expect((generator as any).clearOutputDirectory(outputPath)).resolves.not.toThrow();

      expect(fs.existsSync(outputPath)).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('Validation: Empty clearing function leaves files behind', () => {
    it('should leave files when clearing function does nothing', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      const outputPath = path.join(tmpDir, 'output');

      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(outputPath, { recursive: true });
      fs.writeFileSync(path.join(outputPath, 'file.html'), 'CONTENT');

      const mockPlugin = createMockPluginWithPaths(vaultPath, outputPath);
      const generator = new SiteGenerator(mockPlugin as any);

      await emptyClearFunction((generator as any), outputPath);

      expect(fs.existsSync(path.join(outputPath, 'file.html'))).toBe(true);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});

function createMockPluginWithPaths(vaultPath: string, outputPath: string) {
  const adapter = {
    exists: vi.fn().mockImplementation((p: string) => {
      const resolved = resolveVaultRelativePath(vaultPath, p);
      return Promise.resolve(fs.existsSync(resolved));
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockImplementation((p: string) => {
      const resolved = resolveVaultRelativePath(vaultPath, p);
      if (!fs.existsSync(resolved)) return Promise.resolve({ files: [], folders: [] });
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      const basePath = resolved.endsWith('/') ? resolved : resolved + '/';
      return Promise.resolve({
        files: entries.filter(e => e.isFile()).map(e => basePath + e.name),
        folders: entries.filter(e => e.isDirectory()).map(e => basePath + e.name)
      });
    }),
    remove: vi.fn().mockImplementation((p: string) => {
      const resolved = resolveVaultRelativePath(vaultPath, p);
      if (fs.existsSync(resolved)) {
        if (fs.statSync(resolved).isDirectory()) {
          fs.rmSync(resolved, { recursive: true, force: true });
        } else {
          fs.unlinkSync(resolved);
        }
      }
      return Promise.resolve(undefined);
    }),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(''),
    copy: vi.fn().mockResolvedValue(undefined),
    getBasePath: vi.fn().mockReturnValue(vaultPath)
  };

  return {
    settings: {
      outputDirectory: outputPath,
      siteTitle: 'Test',
      siteDescription: '',
      siteUrl: 'https://test.com',
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
        getName: () => 'test-vault'
      }
    },
    getVaultRootPath: () => vaultPath
  };
}

function resolveVaultRelativePath(vaultPath: string, inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.join(vaultPath, inputPath);
}

async function emptyClearFunction(generator: any, _outputPath: string): Promise<void> {
  return;
}