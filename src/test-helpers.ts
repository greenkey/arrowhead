import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

export interface TestVaultFile {
  path: string;
  content: string;
}

export interface TestVaultConfig {
  vaultPath: string;
  outputPath: string;
  settings?: Partial<ArrowheadSettings>;
}

export interface ArrowheadSettings {
  outputDirectory: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  includeAttachments: boolean;
  generateSitemap: boolean;
  generateRobotsTxt: boolean;
  processWikilinks: boolean;
  processEmbeds: boolean;
  ignoredFolders: string[];
  previewServerPort: number;
  autoRegenerate: boolean;
  postsFolder: string;
  pagesFolder: string;
}

export class TestVaultManager {
  private vaultPath: string;
  private outputPath: string;
  private createdFiles: string[] = [];

  constructor(config: TestVaultConfig) {
    this.vaultPath = config.vaultPath;
    this.outputPath = config.outputPath;
  }

  setup(): void {
    this.createDirectoryStructure();
  }

  cleanup(): void {
    for (const filePath of this.createdFiles) {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.warn(`Failed to clean up: ${filePath}`, error);
      }
    }
    this.createdFiles = [];
  }

  private createDirectoryStructure(): void {
    const directories = [
      this.vaultPath,
      `${this.vaultPath}/posts`,
      `${this.vaultPath}/pages`,
      `${this.vaultPath}/assets`,
      this.outputPath,
      `${this.outputPath}/assets`
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.createdFiles.push(dir);
      }
    }
  }

  createFile(filePath: string, content: string): void {
    const fullPath = path.join(this.vaultPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.createdFiles.push(dir);
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    this.createdFiles.push(fullPath);
  }

  createFiles(files: TestVaultFile[]): void {
    for (const file of files) {
      this.createFile(file.path, file.content);
    }
  }

  getVaultPath(): string {
    return this.vaultPath;
  }

  getOutputPath(): string {
    return this.outputPath;
  }

  getFileContent(relativePath: string): string | undefined {
    const fullPath = path.join(this.vaultPath, relativePath);
    if (!fs.existsSync(fullPath)) {
      return undefined;
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  fileExists(relativePath: string): boolean {
    const fullPath = path.join(this.vaultPath, relativePath);
    return fs.existsSync(fullPath);
  }
}

export class OutputVerifier {
  constructor(private outputPath: string) {}

  fileExists(relativePath: string): boolean {
    const fullPath = path.join(this.outputPath, relativePath);
    return fs.existsSync(fullPath);
  }

  async fileCount(relativePath: string = ''): Promise<number> {
    const fullPath = path.join(this.outputPath, relativePath);

    if (!fs.existsSync(fullPath)) {
      return 0;
    }

    if (fs.statSync(fullPath).isFile()) {
      return 1;
    }

    const files = fs.readdirSync(fullPath);
    let count = 0;

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        count += await this.fileCount(path.join(relativePath, file));
      } else if (file.endsWith('.html')) {
        count++;
      }
    }

    return count;
  }

  readFile(relativePath: string): string {
    const fullPath = path.join(this.outputPath, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  containsText(relativePath: string, text: string): boolean {
    const content = this.readFile(relativePath);
    return content.includes(text);
  }

  countFilesByExtension(extension: string): number {
    let count = 0;

    const countInDirectory = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          countInDirectory(filePath);
        } else if (file.endsWith(extension)) {
          count++;
        }
      }
    };

    countInDirectory(this.outputPath);
    return count;
  }

  listHtmlFiles(): string[] {
    const htmlFiles: string[] = [];

    const listInDirectory = (dirPath: string, basePath: string = '') => {
      if (!fs.existsSync(dirPath)) return;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const relativePath = path.join(basePath, file);

        if (fs.statSync(filePath).isDirectory()) {
          listInDirectory(filePath, relativePath);
        } else if (file.endsWith('.html')) {
          htmlFiles.push(relativePath);
        }
      }
    };

    listInDirectory(this.outputPath);
    return htmlFiles;
  }
}

export function createMockSettings(overrides?: Partial<ArrowheadSettings>): ArrowheadSettings {
  return {
    outputDirectory: '/tmp/test-output',
    siteTitle: 'Test Site',
    siteDescription: 'A test site for integration tests',
    siteUrl: 'https://test.example.com',
    includeAttachments: true,
    generateSitemap: true,
    generateRobotsTxt: true,
    processWikilinks: true,
    processEmbeds: true,
    ignoredFolders: [],
    previewServerPort: 3456,
    autoRegenerate: false,
    postsFolder: 'posts',
    pagesFolder: 'pages',
    ...overrides
  };
}

export function createTemporaryDirectory(): string {
  const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
  return tmpDir;
}

export function cleanupTemporaryDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }
}

export function createMockPlugin(settings?: Partial<ArrowheadSettings>) {
  return {
    settings: createMockSettings(settings),
    app: {
      vault: {
        getName: () => 'test-vault',
        getMarkdownFiles: () => [],
        getFiles: () => [],
        adapter: {
          exists: vi.fn().mockResolvedValue(false),
          mkdir: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue({ files: [], folders: [] }),
          remove: vi.fn().mockResolvedValue(undefined),
          write: vi.fn().mockResolvedValue(undefined),
          copy: vi.fn().mockResolvedValue(undefined)
        }
      },
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue({})
      }
    },
    getVaultRootPath: () => '/test/vault',
    loadSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined)
  };
}