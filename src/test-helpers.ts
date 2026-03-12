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

  async setup(): Promise<void> {
    await this.createDirectoryStructure();
  }

  async cleanup(): Promise<void> {
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

  private async createDirectoryStructure(): Promise<void> {
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

  async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.vaultPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.createdFiles.push(dir);
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    this.createdFiles.push(fullPath);
  }

  async createFiles(files: TestVaultFile[]): Promise<void> {
    for (const file of files) {
      await this.createFile(file.path, file.content);
    }
  }

  getVaultPath(): string {
    return this.vaultPath;
  }

  getOutputPath(): string {
    return this.outputPath;
  }

  async getFileContent(relativePath: string): Promise<string> {
    const fullPath = path.join(this.vaultPath, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.vaultPath, relativePath);
    return fs.existsSync(fullPath);
  }
}

export class OutputVerifier {
  constructor(private outputPath: string) {}

  async fileExists(relativePath: string): Promise<boolean> {
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

  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.outputPath, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async containsText(relativePath: string, text: string): Promise<boolean> {
    const content = await this.readFile(relativePath);
    return content.includes(text);
  }

  async countFilesByExtension(extension: string): Promise<number> {
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

  async listHtmlFiles(): Promise<string[]> {
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

export async function createTemporaryDirectory(): Promise<string> {
  const tmpDir = fs.mkdtempSync('/tmp/arrowhead-test-');
  return tmpDir;
}

export async function cleanupTemporaryDirectory(dirPath: string): Promise<void> {
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