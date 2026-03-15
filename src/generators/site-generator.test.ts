/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { MarkdownProcessor } from '../utils/markdown-processor';
import { pathToUrl } from '../utils/path-utils';

vi.mock('fs');
vi.mock('path');

describe('MarkdownProcessor', () => {
  const createProcessor = (processWikilinks = true, processEmbeds = true) => {
    return new MarkdownProcessor({
      processWikilinks,
      processEmbeds
    });
  };

  it('should process wikilinks correctly', () => {
    const processor = createProcessor();
    const result = processor.processWikiLinks('This is a [[wikilink]] and [[target|display text]]');
    expect(result).toContain('<a href="/wikilink.html">wikilink</a>');
    expect(result).toContain('<a href="/target.html">display text</a>');
  });

  it('should process markdown headers correctly', () => {
    const processor = createProcessor();
    const result = processor.processMarkdownSyntax('# Header\n## Subheader\n### Subsubheader');
    expect(result).toContain('<h1>Header</h1>');
    expect(result).toContain('<h2>Subheader</h2>');
    expect(result).toContain('<h3>Subsubheader</h3>');
  });

  it('should not add <br> tags between list items', () => {
    const processor = createProcessor();
    const result = processor.processMarkdownSyntax('- Item 1\n- Item 2\n- Item 3');
    
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
    expect(result).toContain('<li>Item 3</li>');
    expect(result).toContain('</ul>');
    
    expect(result).not.toContain('<ul><br>');
    expect(result).not.toContain('<br></ul>');
    expect(result).not.toMatch(/<li>.*?<br>.*?<\/li>/);
    
    expect(result).toMatch(/<ul><li>Item 1<\/li><li>Item 2<\/li><li>Item 3<\/li><\/ul>/);
  });

  it('should wrap lines in <p> tags with <br> for line breaks', () => {
    const processor = createProcessor();
    const result = processor.processMarkdownSyntax('Line 1\nLine 2');
    
    expect(result).toContain('<p>Line 1<br>Line 2</p>');
  });

  it('should wrap multiple lines as separate paragraphs', () => {
    const processor = createProcessor();
    const result = processor.processMarkdownSyntax('First paragraph\n\nSecond paragraph\n\nThird paragraph');
    
    expect(result).toContain('<p>First paragraph</p>');
    expect(result).toContain('<p>Second paragraph</p>');
    expect(result).toContain('<p>Third paragraph</p>');
  });

  it('should process markdown emphasis correctly', () => {
    const processor = createProcessor();
    const result = processor.processMarkdownSyntax('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });
});

describe('pathToUrl', () => {
  it('should convert markdown file paths to URLs correctly', () => {
    expect(pathToUrl('pages/test.md')).toBe('pages/test');
    expect(pathToUrl('pages/Test Page.md')).toBe('pages/test-page');
    expect(pathToUrl('test.md')).toBe('test');
  });
});
