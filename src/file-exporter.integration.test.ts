/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { vi } from 'vitest';
import { FileExporter } from './exporters/file-exporter';

function createFileExporterMockPlugin(vaultPath: string, outputDirectory: string) {
  const adapter = {
    exists: vi.fn().mockImplementation((p: string) => Promise.resolve(fs.existsSync(p))),
    mkdir: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockImplementation((p: string) => {
      if (!fs.existsSync(p)) return Promise.resolve({ files: [], folders: [] });
      const entries = fs.readdirSync(p, { withFileTypes: true });
      return Promise.resolve({
        files: entries.filter(e => e.isFile()).map(e => path.join(p, e.name)),
        folders: entries.filter(e => e.isDirectory()).map(e => path.join(p, e.name))
      });
    }),
    remove: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(''),
    copy: vi.fn().mockResolvedValue(undefined),
    getBasePath: vi.fn().mockReturnValue(vaultPath)
  };

  return {
    settings: {
      outputDirectory,
      siteTitle: 'Test Site',
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
    getVaultRootPath: () => vaultPath,
    getAdapter: () => adapter
  };
}

describe('FileExporter Integration Tests', () => {
  describe('validateOutputPath', () => {
    it('should validate relative path inside vault', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, 'output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.validateOutputPath();

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(path.join(vaultPath, 'output'));

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should validate absolute path outside vault', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, '/tmp/external-output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.validateOutputPath();

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/tmp/external-output');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should validate absolute path inside vault', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(path.join(vaultPath, 'output'), { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, path.join(vaultPath, 'output'));
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.validateOutputPath();

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(path.join(vaultPath, 'output'));

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should validate home directory path', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const homeOutput = path.join(os.homedir(), '.arrowhead-output');
      fs.mkdirSync(homeOutput, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, '~/.arrowhead-output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.validateOutputPath();

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(homeOutput);

      fs.rmSync(tmpDir, { recursive: true });
      fs.rmSync(homeOutput, { recursive: true });
    });

    it('should reject invalid path when adapter unavailable', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, 'output');
      (mockPlugin as any).getAdapter = () => null;

      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.validateOutputPath();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unable to access');

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('getAbsoluteOutputPath', () => {
    it('should convert relative path to absolute', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, 'output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getAbsoluteOutputPath();

      expect(result).toBe(path.join(vaultPath, 'output'));

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should return absolute path unchanged', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, '/absolute/path/output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getAbsoluteOutputPath();

      expect(result).toBe('/absolute/path/output');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should expand home directory tilde', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, '~/my-output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getAbsoluteOutputPath();

      expect(result).toBe(path.join(os.homedir(), 'my-output'));

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle path starting with vault root', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, path.join(vaultPath, 'output'));
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getAbsoluteOutputPath();

      expect(result).toBe(path.join(vaultPath, 'output'));

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('getRelativeOutputPath', () => {
    it('should return relative path unchanged', () => {
      const vaultPath = '/tmp/my-vault';
      const mockPlugin = createFileExporterMockPlugin(vaultPath, 'output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getRelativeOutputPath();

      expect(result).toBe('output');
    });

    it('should convert absolute path to relative when inside vault', () => {
      const vaultPath = '/tmp/my-vault';
      const mockPlugin = createFileExporterMockPlugin(vaultPath, '/tmp/my-vault/output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getRelativeOutputPath();

      expect(result).toBe('/output');
    });

    it('should return absolute path unchanged when outside vault', () => {
      const vaultPath = '/tmp/my-vault';
      const mockPlugin = createFileExporterMockPlugin(vaultPath, '/external/output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getRelativeOutputPath();

      expect(result).toBe('/external/output');
    });

    it('should expand and convert home directory path', () => {
      const vaultPath = '/tmp/my-vault';
      const mockPlugin = createFileExporterMockPlugin(vaultPath, '~/output');
      const fileExporter = new FileExporter(mockPlugin as any);
      const result = fileExporter.getRelativeOutputPath();

      expect(result).toBe(path.join(os.homedir(), 'output'));
    });
  });

  describe('Integration: Path handling workflow', () => {
    it('should complete full path workflow: validate -> get absolute -> get relative', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'my-vault');
      fs.mkdirSync(vaultPath, { recursive: true });
      fs.mkdirSync(path.join(vaultPath, 'output'), { recursive: true });

      const mockPlugin = createFileExporterMockPlugin(vaultPath, 'output');
      const fileExporter = new FileExporter(mockPlugin as any);

      const validation = await fileExporter.validateOutputPath();
      expect(validation.valid).toBe(true);

      const absolute = await fileExporter.getAbsoluteOutputPath();
      expect(absolute).toBe(path.join(vaultPath, 'output'));

      const relative = fileExporter.getRelativeOutputPath();
      expect(relative).toBe('output');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should handle external absolute path workflow', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowhead-test-'));
      const vaultPath = path.join(tmpDir, 'vault');
      fs.mkdirSync(vaultPath, { recursive: true });

      const externalPath = '/tmp/external-output';
      const mockPlugin = createFileExporterMockPlugin(vaultPath, externalPath);
      const fileExporter = new FileExporter(mockPlugin as any);

      const validation = await fileExporter.validateOutputPath();
      expect(validation.valid).toBe(true);

      const absolute = await fileExporter.getAbsoluteOutputPath();
      expect(absolute).toBe(externalPath);

      const relative = fileExporter.getRelativeOutputPath();
      expect(relative).toBe(externalPath);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});