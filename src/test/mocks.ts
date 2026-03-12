import { vi, type Mocked, type Mock } from 'vitest';

export interface MockFile {
  path: string;
  name: string;
  extension: string;
  content: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
  parent?: MockFile;
}

export interface MockVaultFile extends MockFile {
  children?: MockVaultFile[];
}

export interface MockMetadataCache {
  getFileCache: Mock<any>;
  setCache: Mock<any>;
  getFrontmatter: Mock<any>;
}

export interface MockVaultAdapter {
  exists: Mock<any>;
  mkdir: Mock<any>;
  list: Mock<any>;
  remove: Mock<any>;
  write: Mock<any>;
  read: Mock<any>;
  copy: Mock<any>;
  getBasePath: Mock<any>;
}

export interface MockVault {
  getName: Mock<any>;
  getMarkdownFiles: Mock<any>;
  getFiles: Mock<any>;
  cachedRead: Mock<any>;
  read: Mock<any>;
  adapter: MockVaultAdapter;
  create: Mock<any>;
  modify: Mock<any>;
  delete: Mock<any>;
  rename: Mock<any>;
  on: Mock<any>;
  off: Mock<any>;
  getAbstractFileByPath: Mock<any>;
}

export interface MockApp {
  vault: MockVault;
  metadataCache: MockMetadataCache;
  workspace: {
    on: Mock<any>;
    off: Mock<any>;
  };
}

export interface MockPluginSettings {
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

export interface MockPlugin {
  settings: MockPluginSettings;
  app: MockApp;
  loadSettings: Mock<any>;
  saveSettings: Mock<any>;
  generateSite: Mock<any>;
  getVaultRootPath: Mock<any>;
}

export function createMockVaultAdapter(): MockVaultAdapter {
  return {
    exists: vi.fn().mockResolvedValue(false),
    mkdir: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ files: [], folders: [] }),
    remove: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(''),
    copy: vi.fn().mockResolvedValue(undefined),
    getBasePath: vi.fn().mockReturnValue('/mock/vault/root')
  };
}

export function createMockMetadataCache(): MockMetadataCache {
  return {
    getFileCache: vi.fn().mockReturnValue({
      frontmatter: {},
      links: [],
      embeds: []
    }),
    setCache: vi.fn(),
    getFrontmatter: vi.fn().mockReturnValue({})
  };
}

export function createMockVault(): MockVault {
  const adapter = createMockVaultAdapter();

  return {
    getName: vi.fn().mockReturnValue('test-vault'),
    getMarkdownFiles: vi.fn().mockReturnValue([]),
    getFiles: vi.fn().mockReturnValue([]),
    cachedRead: vi.fn().mockResolvedValue(''),
    read: vi.fn().mockResolvedValue(''),
    adapter,
    create: vi.fn().mockResolvedValue({}),
    modify: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    getAbstractFileByPath: vi.fn().mockReturnValue(null)
  };
}

export function createMockApp(): MockApp {
  return {
    vault: createMockVault(),
    metadataCache: createMockMetadataCache(),
    workspace: {
      on: vi.fn(),
      off: vi.fn()
    }
  };
}

export function createMockPluginSettings(overrides?: Partial<MockPluginSettings>): MockPluginSettings {
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

export function createMockPlugin(settings?: Partial<MockPluginSettings>): MockPlugin {
  return {
    settings: createMockPluginSettings(settings),
    app: createMockApp(),
    loadSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    generateSite: vi.fn().mockResolvedValue(undefined),
    getVaultRootPath: vi.fn().mockReturnValue('/mock/vault/root')
  };
}

export function createMockVaultWithFiles(files: MockVaultFile[]): MockVault {
  const vault = createMockVault();
  vault.getMarkdownFiles = vi.fn().mockReturnValue(files.filter(f => f.extension === 'md'));
  vault.getFiles = vi.fn().mockReturnValue(files);

  for (const file of files) {
    vault.cachedRead = vi.fn().mockResolvedValue(file.content);
  }

  return vault;
}

export function setupMockVaultFileOperations(vault: MockVault, files: MockVaultFile[]): void {
  vault.getAbstractFileByPath = vi.fn().mockImplementation((path: string) => {
    return files.find(f => f.path === path) || null;
  });

  vault.cachedRead = vi.fn().mockImplementation((file: MockVaultFile) => {
    const found = files.find(f => f.path === file.path);
    return Promise.resolve(found?.content || '');
  });

  vault.read = vi.fn().mockImplementation((file: MockVaultFile) => {
    const found = files.find(f => f.path === file.path);
    return Promise.resolve(found?.content || '');
  });

  vault.delete = vi.fn().mockImplementation((file: MockVaultFile) => {
    const index = files.findIndex(f => f.path === file.path);
    if (index > -1) {
      files.splice(index, 1);
    }
    return Promise.resolve();
  });

  vault.rename = vi.fn().mockImplementation((file: MockVaultFile, newPath: string) => {
    const found = files.find(f => f.path === file.path);
    if (found) {
      found.path = newPath;
      found.name = newPath.split('/').pop() || found.name;
    }
    return Promise.resolve();
  });
}