/* eslint-disable @typescript-eslint/no-explicit-any */
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

  it('should not add <br> tags between list items', () => {
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
    
    const result = (generator as any).processMarkdownSyntax('- Item 1\n- Item 2\n- Item 3');
    
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
    expect(result).toContain('<li>Item 3</li>');
    expect(result).toContain('</ul>');
    
    // Ensure <br> tags are NOT between list items
    expect(result).not.toContain('<ul><br>');
    expect(result).not.toContain('<br></ul>');
    expect(result).not.toMatch(/<li>.*?<br>.*?<\/li>/);
    
    // Should have <ul> without <br> inside
    expect(result).toMatch(/<ul><li>Item 1<\/li><li>Item 2<\/li><li>Item 3<\/li><\/ul>/);
  });

  it('should add <br> tags for line breaks outside HTML elements', () => {
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
    
    const result = (generator as any).processMarkdownSyntax('Line 1\nLine 2');
    
    expect(result).toContain('Line 1<br>Line 2');
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