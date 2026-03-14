import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiteGenerator } from './site-generator';

describe('SiteGenerator - Failing Test for Attachment Bug', () => {
  let copiedPaths: { source: string; target: string }[];

  beforeEach(() => {
    copiedPaths = [];
  });

  it('should NOT create nested /public/assets/public/ directories when copying attachments', async () => {
    const mockPlugin = {
      getVaultRootPath: () => '/Users/lorenzo.mele/Obsidian/loman.it',
      settings: {
        outputDirectory: 'public',
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        includeAttachments: true,
        generateSitemap: true,
        generateRobotsTxt: true,
        processWikilinks: true,
        processEmbeds: true,
        customCssPath: '',
        customJsPath: '',
        ignoredFolders: [],
        previewServerPort: 3456,
        autoRegenerate: true
      },
      app: {
        vault: {
          adapter: {
            exists: vi.fn().mockResolvedValue(true),
            mkdir: vi.fn().mockResolvedValue(undefined),
            write: vi.fn().mockResolvedValue(undefined),
            copy: vi.fn().mockImplementation(async (source: string, target: string) => {
              copiedPaths.push({ source, target });
            })
          },
          getAbstractFileByPath: vi.fn((path: string) => {
            if (path === 'image.jpg' || path === 'document.pdf') {
              return { path };
            }
            return null;
          })
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generator = new SiteGenerator(mockPlugin as any);

    const mockAttachments = [
      { path: 'image.jpg' },
      { path: 'document.pdf' }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (generator as any).copyAttachments(mockAttachments, 'public');

    console.debug('Copy calls:', JSON.stringify(copiedPaths, null, 2));

    expect(copiedPaths).toHaveLength(2);

    const imageCopy = copiedPaths.find(c => c.source === 'image.jpg');
    expect(imageCopy).toBeDefined();
    expect(imageCopy?.target).toBe('public/assets/image.jpg');
    expect(imageCopy?.target).not.toContain('/public/assets/public/');

    const pdfCopy = copiedPaths.find(c => c.source === 'document.pdf');
    expect(pdfCopy).toBeDefined();
    expect(pdfCopy?.target).toBe('public/assets/document.pdf');
    expect(pdfCopy?.target).not.toContain('/public/assets/public/');
  });
});