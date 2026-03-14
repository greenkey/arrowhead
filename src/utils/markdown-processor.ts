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
        i++;
        continue;
      }
      
      const listMatch = line.match(/^(\s*)([-*+]) (.+)$/);
      
      if (!listMatch) {
        resultLines.push(line);
        i++;
        continue;
      }
      
      const baseIndent = listMatch[1]?.length ?? 0;
      const listItems: { indent: number; text: string }[] = [];
      
      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine) {
          i++;
          continue;
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
    let result = '';
    let i = 0;
    let depth = 0;
    
    while (i < content.length) {
      const char = content[i];
      
      if (char === '<') {
        if (content.slice(i).startsWith('</')) {
          const closeTagMatch = content.slice(i).match(/^<\/([a-zA-Z][a-zA-Z0-9]*)>/);
          if (closeTagMatch) {
            depth = Math.max(0, depth - 1);
            result += content.slice(i, i + closeTagMatch[0].length);
            i += closeTagMatch[0].length;
            continue;
          }
        } else {
          const openTagMatch = content.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/);
          if (openTagMatch) {
            depth++;
            result += content.slice(i, i + openTagMatch[0].length);
            i += openTagMatch[0].length;
            continue;
          }
        }
        result += char;
        i++;
        continue;
      }
      
      if (char === '\n' && depth === 0) {
        result += '<br>';
      } else {
        result += char;
      }
      
      i++;
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
