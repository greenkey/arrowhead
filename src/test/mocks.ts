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
  getFileCache: Mock<unknown>;
  setCache: Mock<unknown>;
  getFrontmatter: Mock<unknown>;
}

export interface MockVaultAdapter {
  exists: Mock<unknown>;
  mkdir: Mock<unknown>;
  list: Mock<unknown>;
  remove: Mock<unknown>;
  write: Mock<unknown>;
  read: Mock<unknown>;
  copy: Mock<unknown>;
  getBasePath: Mock<unknown>;
}

export interface MockVault {
  getName: Mock<unknown>;
  getMarkdownFiles: Mock<unknown>;
  getFiles: Mock<unknown>;
  cachedRead: Mock<unknown>;
  read: Mock<unknown>;
  adapter: MockVaultAdapter;
  create: Mock<unknown>;
  modify: Mock<unknown>;
  delete: Mock<unknown>;
  rename: Mock<unknown>;
  on: Mock<unknown>;
  off: Mock<unknown>;
  getAbstractFileByPath: Mock<unknown>;
}

export interface MockApp {
  vault: MockVault;
  metadataCache: MockMetadataCache;
  workspace: {
    on: Mock<unknown>;
    off: Mock<unknown>;
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
  loadSettings: Mock<unknown>;
  saveSettings: Mock<unknown>;
  generateSite: Mock<unknown>;
  getVaultRootPath: Mock<unknown>;
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

export function createMockVaultFile(params: {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
  ctime?: number;
  mtime?: number;
}): MockVaultFile {
  const name = params.path.split('/').pop() || params.path;
  const extension = name.split('.').pop() || '';
  const now = Date.now();
  return {
    path: params.path,
    name: name,
    extension: extension,
    content: params.content,
    stat: {
      ctime: params.ctime || now - 10000,
      mtime: params.mtime || now,
      size: params.content.length
    }
  };
}

export function createMockMetadataCacheWithFrontmatter(frontmatter: Record<string, unknown>): MockMetadataCache {
  return {
    getFileCache: vi.fn().mockReturnValue({
      frontmatter: frontmatter,
      links: [],
      embeds: []
    }),
    setCache: vi.fn(),
    getFrontmatter: vi.fn().mockReturnValue(frontmatter)
  };
}

export interface TestVaultFile {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

export function createMockVaultWithTestFiles(
  files: TestVaultFile[],
  vaultPath: string = '/test/vault'
): MockVault {
  const mockFiles: MockVaultFile[] = files.map(file =>
    createMockVaultFile({
      path: file.path,
      content: file.content,
      frontmatter: file.frontmatter
    })
  );

  const vault = createMockVault();
  vault.getName = vi.fn().mockReturnValue('test-vault');
  vault.getMarkdownFiles = vi.fn().mockReturnValue(mockFiles.filter(f => f.extension === 'md'));
  vault.getFiles = vi.fn().mockReturnValue(mockFiles);

  vault.cachedRead = vi.fn().mockImplementation((file: MockVaultFile) => {
    const found = mockFiles.find(f => f.path === file.path);
    return Promise.resolve(found?.content || '');
  });

  vault.read = vi.fn().mockImplementation((file: MockVaultFile) => {
    const found = mockFiles.find(f => f.path === file.path);
    return Promise.resolve(found?.content || '');
  });

  vault.getAbstractFileByPath = vi.fn().mockImplementation((path: string) => {
    return mockFiles.find(f => f.path === path) || null;
  });

  const adapter = createMockVaultAdapter();
  adapter.getBasePath = vi.fn().mockReturnValue(vaultPath);
  vault.adapter = adapter;

  return vault;
}

export function createEnhancedMockPlugin(params: {
  vaultFiles?: TestVaultFile[];
  vaultPath?: string;
  settings?: Partial<MockPluginSettings>;
  getVaultRootPathImpl?: () => string;
}): MockPlugin {
  const vaultPath = params.vaultPath || '/test/vault';
  const vault = params.vaultFiles
    ? createMockVaultWithTestFiles(params.vaultFiles, vaultPath)
    : createMockVault();

  const getVaultRootPathFn = params.getVaultRootPathImpl || (() => vaultPath);
  return {
    settings: createMockPluginSettings(params.settings),
    app: {
      vault: vault,
      metadataCache: createMockMetadataCache(),
      workspace: {
        on: vi.fn(),
        off: vi.fn()
      }
    },
    loadSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    generateSite: vi.fn().mockResolvedValue(undefined),
    getVaultRootPath: vi.fn().mockImplementation(getVaultRootPathFn)
  };
}

export function simulateFileModification(vault: MockVault, filePath: string, newContent: string): void {
  const files = (vault.getMarkdownFiles as unknown as () => MockVaultFile[])();
  const file = files.find(f => f.path === filePath);
  if (file) {
    file.content = newContent;
    file.stat.mtime = Date.now();
    file.stat.size = newContent.length;
  }
}

export function createVaultConfig(params: {
  postsFolder?: string;
  pagesFolder?: string;
  ignoredFolders?: string[];
}): MockPluginSettings {
  return createMockPluginSettings({
    postsFolder: params.postsFolder || 'posts',
    pagesFolder: params.pagesFolder || 'pages',
    ignoredFolders: params.ignoredFolders || []
  });
}