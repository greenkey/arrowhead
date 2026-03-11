import { describe, it, expect, vi } from 'vitest';
import { SiteGenerator } from './site-generator';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('SiteGenerator', () => {
  it('should process wikilinks correctly', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: ''
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    const result = (generator as any).processWikiLinks('This is a [[wikilink]] and [[target|display text]]');
    expect(result).toContain('<a href="/wikilink.html">wikilink</a>');
    expect(result).toContain('<a href="/target.html">display text</a>');
  });

  it('should process markdown headers correctly', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: ''
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    const result = (generator as any).processMarkdownSyntax('# Header\n## Subheader\n### Subsubheader');
    expect(result).toContain('<h1>Header</h1>');
    expect(result).toContain('<h2>Subheader</h2>');
    expect(result).toContain('<h3>Subsubheader</h3>');
  });

  it('should process markdown emphasis correctly', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: ''
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    const result = (generator as any).processMarkdownSyntax('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('should generate valid HTML page structure', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: ''
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    const content = 'Test content';
    const fileData = {
      name: 'test',
      frontmatter: {},
      modified: Date.now()
    };
    
    const html = (generator as any).createHtmlPage(content, fileData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('Test Site');
    expect(html).toContain('Test content');
  });

  it('should convert markdown file paths to URLs correctly', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: ''
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    expect((generator as any).convertPathToUrl('pages/test.md')).toBe('pages/test');
    expect((generator as any).convertPathToUrl('pages/Test Page.md')).toBe('pages/test-page');
    expect((generator as any).convertPathToUrl('test.md')).toBe('test');
  });
});