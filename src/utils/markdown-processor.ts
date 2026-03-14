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
    
    processed = processed.replace(/^- (.+)$/gm, "<li>$1</li>");
    processed = processed.replace(/(<li>.*?<\/li>\n*)+/g, (match) => "<ul>" + match.replace(/\n/g, '') + "</ul>");
    
    processed = this.replaceNewlinesOutsideHtml(processed);
    
    return processed;
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
