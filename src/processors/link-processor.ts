import ArrowheadPlugin from "../main";
import { VaultData, VaultFile } from "../utils/vault-walker";
import { PathResolver } from "../utils/path-resolver";

export class LinkProcessor {
  private plugin: ArrowheadPlugin;
  private pathResolver: PathResolver;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
    this.pathResolver = new PathResolver(plugin);
  }

  processLinks(file: VaultFile, vaultData: VaultData): string {
    let content = file.content;
    
    if (this.plugin.settings.processWikilinks) {
      content = this.processWikiLinks(content, file.path);
    }
    
    content = this.processMarkdownLinks(content, file.path);
    content = this.processAssetLinks(content, file.path);
    content = this.processExternalLinks(content);
    
    return content;
  }

  private processWikiLinks(content: string, sourcePath: string): string {
    const wikiLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    
    return content.replace(wikiLinkRegex, (match, target, displayText) => {
      const url = this.pathResolver.resolveToUrl(target, sourcePath);
      const text = displayText || this.getDisplayText(target);
      
      if (match.startsWith("!")) {
        return this.createEmbed(match, target, sourcePath);
      }
      
      return `<a href="${url}">${text}</a>`;
    });
  }

  private processMarkdownLinks(content: string, sourcePath: string): string {
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    return content.replace(mdLinkRegex, (match, text, url) => {
      if (url.startsWith("#")) {
        return `<a href="${url}">${text}</a>`;
      }
      
      if (url.startsWith("file://")) {
        const filePath = url.replace("file://", "");
        const resolvedUrl = this.pathResolver.resolveToUrl(filePath, sourcePath);
        return `<a href="${resolvedUrl}">${text}</a>`;
      }
      
      if (this.pathResolver.isInternalLink(url)) {
        const resolvedUrl = this.pathResolver.resolveToUrl(url, sourcePath);
        return `<a href="${resolvedUrl}">${text}</a>`;
      }
      
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
  }

  private processAssetLinks(content: string, sourcePath: string): string {
    const assetRegex = /\[([^\]]+)\]\(([^)]+\.(?:jpg|jpeg|png|gif|webp|svg|mp3|wav|mp4|webm)(?:\?[^\)]*)?)\)/g;
    
    return content.replace(assetRegex, (match, text, url) => {
      const assetPath = this.pathResolver.resolveAssetPath(url, sourcePath);
      const isImage = /\.(?:jpg|jpeg|png|gif|webp|svg)$/i.test(url);
      
      if (isImage) {
        return `<img src="${assetPath}" alt="${text}" loading="lazy">`;
      }
      
      return `<a href="${assetPath}" target="_blank">${text}</a>`;
    });
  }

  private processExternalLinks(content: string): string {
    const externalLinkRegex = /<a href="(https?:\/\/[^"]+)"/g;
    
    return content.replace(externalLinkRegex, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  }

  private getDisplayText(target: string): string {
    const cleanTarget = target.replace(/[#?].*$/, "");
    const fileName = cleanTarget.substring(cleanTarget.lastIndexOf("/") + 1);
    return fileName.replace(/-/g, " ").replace(/\.md$/i, "");
  }

  private createEmbed(match: string, target: string, sourcePath: string): string {
    const ext = target.toLowerCase();
    
    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg") || 
        ext.endsWith(".png") || ext.endsWith(".gif") || 
        ext.endsWith(".webp") || ext.endsWith(".svg")) {
      const assetPath = this.pathResolver.resolveAssetPath(target, sourcePath);
      return `<img src="${assetPath}" alt="${this.getDisplayText(target)}" loading="lazy">`;
    }
    
    if (ext.endsWith(".md")) {
      const pageUrl = this.pathResolver.resolveToUrl(target, sourcePath);
      return `<div class="embed" data-src="${pageUrl}"></div>`;
    }
    
    const assetPath = this.pathResolver.resolveAssetPath(target, sourcePath);
    return `<a href="${assetPath}" class="embed" target="_blank">${this.getDisplayText(target)}</a>`;
  }
}