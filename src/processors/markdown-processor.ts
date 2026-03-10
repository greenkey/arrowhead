import ArrowheadPlugin from "../main";

export class MarkdownProcessor {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  process(content: string): string {
    let processed = content;
    
    processed = this.removeFrontmatter(processed);
    processed = this.processCodeBlocks(processed);
    processed = this.processHeadings(processed);
    processed = this.processInlineFormatting(processed);
    processed = this.processLists(processed);
    processed = this.processTables(processed);
    processed = this.processBlockquotes(processed);
    processed = this.processHorizontalRules(processed);
    processed = this.processLineBreaks(processed);
    
    return processed;
  }

  private removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n?/;
    return content.replace(frontmatterRegex, "");
  }

  private processCodeBlocks(content: string): string {
    return content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    });
  }

  private processHeadings(content: string): string {
    let processed = content;
    
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    processed = processed.replace(headingRegex, (match, hashes, text) => {
      const level = hashes.length;
      return `<h${level}>${text}</h${level}>`;
    });
    
    return processed;
  }

  private processInlineFormatting(content: string): string {
    let processed = content;
    
    processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");
    processed = processed.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
    processed = processed.replace(/__(.+?)__/g, "<strong>$1</strong>");
    processed = processed.replace(/_(.+?)_/g, "<em>$1</em>");
    processed = processed.replace(/`(.+?)`/g, "<code>$1</code>");
    processed = processed.replace(/~~(.+?)~~/g, "<del>$1</del>");
    
    return processed;
  }

  private processLists(content: string): string {
    let processed = content;
    
    const orderedListRegex = /^((\d+)\.)\s+(.+)$/gm;
    processed = processed.replace(orderedListRegex, '<li class="list-item">$3</li>');
    
    const unorderedListRegex = /^([-*])\s+(.+)$/gm;
    processed = processed.replace(unorderedListRegex, '<li class="list-item">$2</li>');
    
    const listGroupRegex = /(<li class="list-item">.*<\/li>\n?)+/g;
    processed = processed.replace(listGroupRegex, (match) => {
      const items = match.trim().split("\n").filter(Boolean);
      const firstItem = items[0];
      if (!firstItem) return match;
      const isOrdered = firstItem.startsWith("<ol");
      const tagStart = isOrdered ? "<ol class=\"list\">" : "<ul class=\"list\">";
      const closingTag = isOrdered ? "</ol>" : "</ul>";
      return tagStart + "\n" + items.join("\n") + "\n" + closingTag;
    });
    
    return processed;
  }

  private processTables(content: string): string {
    const tableRegex = /^\|(.+)\|\n\|[-:|]+\|\n(\|.+|\n)+$/gm;
    
    return content.replace(tableRegex, (match) => {
      const rows = match.trim().split("\n");
      if (rows.length === 0) return match;
      const headerRow = rows[0];
      if (!headerRow) return match;
      const headerCells = headerRow.split("|").slice(1, -1).map(cell => 
        `<th>${cell.trim()}</th>`
      ).join("");
      
      const bodyRows = rows.slice(2).map(row => {
        const cells = row.split("|").slice(1, -1).map(cell => 
          `<td>${cell.trim()}</td>`
        ).join("");
        return `<tr>${cells}</tr>`;
      }).join("\n");
      
      return `<table>\n<thead>\n<tr>${headerCells}</tr>\n</thead>\n<tbody>\n${bodyRows}\n</tbody>\n</table>`;
    });
  }

  private processBlockquotes(content: string): string {
    const blockquoteRegex = /^>\s*(.+)$/gm;
    
    return content.replace(blockquoteRegex, (match, text) => {
      return `<blockquote>${text}</blockquote>`;
    });
  }

  private processHorizontalRules(content: string): string {
    return content.replace(/^[-*_]{3,}$/gm, "<hr>");
  }

  private processLineBreaks(content: string): string {
    return content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  }
}