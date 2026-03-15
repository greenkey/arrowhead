import { encodeUrlPath, pathToUrl as pathToUrlUtil } from "./path-utils";

export interface OutgoingLink {
  target: string;
  originalText: string;
  displayText?: string;
  type: "wiki" | "url" | "embed" | "asset";
}

export interface MarkdownProcessorOptions {
  processWikilinks: boolean;
  processEmbeds: boolean;
}

export class MarkdownProcessor {
  private shouldProcessWikilinks: boolean;
  private shouldProcessEmbeds: boolean;

  constructor(options: MarkdownProcessorOptions) {
    this.shouldProcessWikilinks = options.processWikilinks;
    this.shouldProcessEmbeds = options.processEmbeds;
  }

  process(
    content: string,
    links: OutgoingLink[],
    embeds: string[]
  ): string {
    let processed = content;

    processed = this.removeFrontmatter(processed);
    processed = this.processLinks(processed, links);
    processed = this.processEmbedsInContent(processed, embeds);

    return processed;
  }

  processContent(content: string): string {
    let processed = content;

    if (this.shouldProcessWikilinks) {
      processed = this.processWikiLinks(processed);
    }

    processed = this.processMarkdownSyntax(processed);

    return processed;
  }

  removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\s*\n?/;
    return content.replace(frontmatterRegex, "");
  }

  processWikiLinks(content: string): string {
    return content.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_match, target, displayText) => {
      const url = this.wikiLinkToUrl(target);
      const text = displayText || target;
      return `<a href="${url}">${text}</a>`;
    });
  }

  wikiLinkToUrl(wikiLink: string): string {
    let url = wikiLink;

    url = url.replace(/\s+/g, "-");
    url = url.toLowerCase();
    url = encodeUrlPath(url);

    url = `/${url}.html`;

    return url;
  }

  processMarkdownSyntax(content: string): string {
    let processed = content;
    
    processed = processed.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
    processed = processed.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
    processed = processed.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    processed = processed.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    processed = processed.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    processed = processed.replace(/^# (.+)$/gm, "<h1>$1</h1>");
    
    processed = processed.replace(/^---+$/gm, "<hr>");
    processed = processed.replace(/^\*\*\*+$/gm, "<hr>");
    processed = processed.replace(/^___+$/gm, "<hr>");
    
    processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");
    processed = processed.replace(/`(.+?)`/g, "<code>$1</code>");
    
    processed = this.processLists(processed);
    
    processed = this.replaceNewlinesOutsideHtml(processed);
    
    return processed;
  }

  processLists(content: string): string {
    const lines = content.split('\n');
    const resultLines: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        resultLines.push('');
        i++;
        continue;
      }
      
      const listMatch = line.match(/^(\s*)([-*+]) (.+)$/);
      
      if (!listMatch) {
        resultLines.push(line);
        i++;
        continue;
      }

      // ... rest of list processing
      const baseIndent = listMatch[1]?.length ?? 0;
      const listItems: { indent: number; text: string }[] = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine) {
          break;
        }
        
        const currentMatch = currentLine.match(/^(\s*)([-*+]) (.+)$/);
        
        if (!currentMatch) {
          break;
        }
        
        const currentIndent = currentMatch[1]?.length ?? 0;
        const itemText = currentMatch[3] ?? '';
        
        if (currentIndent < baseIndent) {
          break;
        }
        
        const relativeIndent = currentIndent - baseIndent;
        listItems.push({ indent: relativeIndent, text: itemText });
        i++;
      }

      if (listItems.length > 0) {
        const nestedHtml = this.buildNestedListFromItems(listItems);
        resultLines.push(nestedHtml);
      }
    }
    
    return resultLines.join('\n');
  }

  buildNestedListFromItems(items: { indent: number; text: string }[]): string {
    if (items.length === 0) return '';
    
    let html = '<ul>';
    let i = 0;
    
    while (i < items.length) {
      const item = items[i];
      if (!item) {
        i++;
        continue;
      }
      
      const currentIndent = item.indent;
      html += '<li>' + item.text;
      
      const nestedItems: { indent: number; text: string }[] = [];
      let j = i + 1;
      
      while (j < items.length) {
        const nextItem = items[j];
        if (!nextItem) {
          j++;
          continue;
        }
        
        if (nextItem.indent > currentIndent) {
          nestedItems.push({ indent: nextItem.indent - currentIndent - 1, text: nextItem.text });
          j++;
        } else {
          break;
        }
      }
      
      if (nestedItems.length > 0) {
        html += this.buildNestedListFromItems(nestedItems);
      }
      
      html += '</li>';
      i = j;
    }
    
    html += '</ul>';
    return html;
  }

  replaceNewlinesOutsideHtml(content: string): string {
    const headerRegex = /<h[1-6][^>]*>.*?<\/h[1-6]>/gi;
    const headers: { start: number; end: number; tag: string }[] = [];
    let match;
    
    while ((match = headerRegex.exec(content)) !== null) {
      headers.push({
        start: match.index,
        end: match.index + match[0].length,
        tag: match[0]
      });
    }
    
    let result = '';
    let lastEnd = 0;
    
    for (const header of headers) {
      if (header.start > lastEnd) {
        const beforeHeader = content.slice(lastEnd, header.start);
        if (beforeHeader.trim()) {
          result += this.wrapInParagraphs(beforeHeader);
        }
      }
      result += header.tag;
      lastEnd = header.end;
    }
    
    if (lastEnd < content.length) {
      const remaining = content.slice(lastEnd);
      if (remaining.trim()) {
        result += this.wrapInParagraphs(remaining);
      }
    }
    
    return result;
  }

  private wrapInParagraphs(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    let result = '';
    
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      
      const lines = trimmed.split('\n');
      const wrappedLines = lines.map(line => line.trim()).filter(line => line);
      
      if (wrappedLines.length > 0) {
        result += '<p>' + wrappedLines.join('<br>') + '</p>';
      }
    }
    
    return result;
  }

  processLinks(content: string, links: OutgoingLink[]): string {
    const linkMap = new Map<string, string>();
    
    for (const link of links) {
      if (link.type === "wiki") {
        const url = this.wikiLinkToUrl(link.target);
        linkMap.set(link.originalText, `<a href="${url}">${link.displayText || link.target}</a>`);
      } else if (link.type === "url") {
        const target = link.target;
        const text = link.displayText || target;
        linkMap.set(link.originalText, `<a href="${target}" target="_blank" rel="noopener">${text}</a>`);
      }
    }
    
    let processedContent = content;
    for (const [original, replacement] of linkMap) {
      processedContent = processedContent.replace(original, replacement);
    }
    
    return processedContent;
  }

  processEmbedsInContent(content: string, embeds: string[]): string {
    let processed = this.processContent(content);

    if (!this.shouldProcessEmbeds) {
      return processed;
    }

    for (const embed of embeds) {
      if (embed.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const assetPath = this.embedToAssetPath(embed);
        const imgTag = `<img src="${assetPath}" alt="${embed}" loading="lazy">`;
        processed = processed.replace(`![[${embed}]]`, imgTag);
        processed = processed.replace(`![](${embed})`, imgTag);
      }
    }

    return processed;
  }

  embedToAssetPath(embed: string): string {
    return `../assets/${embed}`;
  }

  pathToUrl(filePath: string): string {
    return pathToUrlUtil(filePath);
  }
}
