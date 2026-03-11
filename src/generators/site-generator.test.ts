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
        customJsPath: '',
        templateName: 'default'
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
        customJsPath: '',
        templateName: 'default'
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
        customJsPath: '',
        templateName: 'default'
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    const result = (generator as any).processMarkdownSyntax('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('should convert markdown file paths to URLs correctly', () => {
    const mockPlugin = {
      settings: {
        siteTitle: 'Test Site',
        siteDescription: 'Test Description',
        siteUrl: 'https://example.com',
        customCssPath: '',
        customJsPath: '',
        templateName: 'default'
      }
    };
    
    const generator = new SiteGenerator(mockPlugin as any);
    
    expect((generator as any).pathToUrl('pages/test.md')).toBe('pages/test');
    expect((generator as any).pathToUrl('pages/Test Page.md')).toBe('pages/test-page');
    expect((generator as any).pathToUrl('test.md')).toBe('test');
  });
});