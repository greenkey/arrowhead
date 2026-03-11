import { describe, it, expect, vi } from 'vitest';

// Mock modules before importing our code
vi.mock('fs');
vi.mock('path');
import { SiteGenerator } from './site-generator';

describe('SiteGenerator - Failing Test for Attachment Bug', () => {
  it('should NOT create nested /public/assets/public/ directories when copying attachments', () => {
    const mockPlugin = {
      getVaultRootPath: () => '/Users/lorenzo.mele/Obsidian/loman.it',
      settings: {
        outputDirectory: 'public',
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        includeAttachments: true,
        generateIndex: true,
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
            exists: vi.fn(),
            mkdir: vi.fn(),
            write: vi.fn(),
            copy: vi.fn()
          }
        }
      }
    };

    const generator = new SiteGenerator(mockPlugin as any);

    // Mock path operations
    const path = require('path');
    path.isAbsolute = vi.fn((x: string) => x.startsWith('/'));
    path.join = vi.fn((...args: string[]) => args.join('/'));
    path.dirname = vi.fn((x: string) => {
      if (x.includes('/')) {
        return x.substring(0, x.lastIndexOf('/'));
      }
      return '.';
    });

    // Mock fs operations
    const fs = require('fs');
    fs.existsSync = vi.fn(() => true);
    fs.mkdirSync = vi.fn();
    fs.copyFileSync = vi.fn();

    const mockAttachments = [
      { path: 'image.jpg' },
      { path: 'document.pdf' }
    ];

    (generator as any).copyAttachments(mockAttachments, 'public');

    // This should fail because the current implementation creates wrong paths
    const calls = fs.copyFileSync.mock.calls;
    console.log('Copy calls:', calls);

    // Check if we have any nested 'public' paths (which indicates the bug)
    const hasBug = calls && calls.some((call: string[]) => 
      call[1] && call[1].includes('/public/assets/public/')
    );

    if (hasBug) {
      throw new Error('TEST FAILS: Found nested /public/assets/public/ paths - this is the bug!');
    }

    // Expect the correct behavior (which should fail)
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/Users/lorenzo.mele/Obsidian/loman.it/image.jpg',
      '/Users/lorenzo.mele/Obsidian/loman.it/public/assets/image.jpg'
    );
  });
});