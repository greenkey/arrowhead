import ArrowheadPlugin from "../main";
import { TFile, CachedMetadata } from "obsidian";

export interface VaultData {
  files: VaultFile[];
  folders: VaultFolder[];
  tags: Map<string, VaultFile[]>;
  links: SiteLink[];
  attachments: VaultFile[];
  totalSize: number;
  excludedFiles: string[];
}

export interface MattermostMetadata {
  date?: string;
}

export interface VaultFile {
  path: string;
  name: string;
  extension: string;
  content: string;
  frontmatter: Record<string, unknown>;
  mattermost?: MattermostMetadata;
  tags: string[];
  links: OutgoingLink[];
  embeds: string[];
  created: number;
  modified: number;
  size: number;
  pageType?: 'post' | 'page';
}

export interface VaultFolder {
  path: string;
  name: string;
  children: (VaultFolder | VaultFile)[];
  fileCount: number;
}

export interface OutgoingLink {
  target: string;
  originalText: string;
  displayText?: string;
  type: "wiki" | "url" | "embed" | "asset";
}

export interface SiteLink {
  source: string;
  target: string;
  type: "internal" | "external" | "broken";
}

export function classifyFile(path: string, postsFolder: string, pagesFolder: string): 'post' | 'page' | null {
  const normalizedPath = path.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');
  
  if (pathParts[0] === postsFolder) {
    return 'post';
  }
  
  if (pathParts[0] === pagesFolder) {
    return 'page';
  }
  
  for (let i = 1; i < pathParts.length - 1; i++) {
    if (pathParts[i] === postsFolder) {
      return 'post';
    }
    if (pathParts[i] === pagesFolder) {
      return 'page';
    }
  }
  
  return null;
}

export class VaultWalker {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  async collectVaultData(): Promise<VaultData> {
    const files: VaultFile[] = [];
    const folders: VaultFolder[] = [];
    const tags = new Map<string, VaultFile[]>();
    const attachments: VaultFile[] = [];
    const links: SiteLink[] = [];
    const excludedFiles: string[] = [];
    
    const vault = this.plugin.app.vault;
    const ignoredFolders = new Set(this.plugin.settings.ignoredFolders);
    const postsFolder = this.plugin.settings.postsFolder || "posts";
    const pagesFolder = this.plugin.settings.pagesFolder || "pages";

    const allFiles = vault.getMarkdownFiles();
    
    for (const file of allFiles) {
      const parentPath = file.parent?.path || "";
      
      if (ignoredFolders.has(parentPath) || parentPath.startsWith(".")) {
        continue;
      }

      const fileData = await this.processMarkdownFile(file);
      
      const pageType = classifyFile(file.path, postsFolder, pagesFolder);
      
      if (pageType === null) {
        console.warn(`[VaultWalker] Excluding file not in posts/pages folder: ${file.path}`);
        excludedFiles.push(file.path);
        continue;
      }
      
      fileData.pageType = pageType;
      files.push(fileData);

      for (const tag of fileData.tags) {
        if (!tags.has(tag)) {
          tags.set(tag, []);
        }
        tags.get(tag)!.push(fileData);
      }

      for (const link of fileData.links) {
        if (link.type === "wiki" || link.type === "embed") {
          links.push({
            source: file.path,
            target: link.target,
            type: this.resolveLinkType(file.path, link.target)
          });
        }
      }
    }

    const attachmentFiles = vault.getFiles().filter(f => 
      !f.name.endsWith(".md") && 
      !f.name.endsWith(".html") && 
      !ignoredFolders.has(f.parent?.path || "")
    );
    
    for (const file of attachmentFiles) {
      const content = await vault.cachedRead(file);
      attachments.push({
        path: file.path,
        name: file.name,
        extension: file.extension,
        content: content,
        frontmatter: {},
        tags: [],
        links: [],
        embeds: [],
        created: 0,
        modified: file.stat.mtime,
        size: file.stat.size
      });
    }

    return {
      files,
      folders,
      tags,
      links,
      attachments,
      totalSize: files.reduce((sum, f) => sum + f.size, 0) + attachments.reduce((sum, f) => sum + f.size, 0),
      excludedFiles
    };
  }

  private async processMarkdownFile(file: TFile): Promise<VaultFile> {
    const vault = this.plugin.app.vault;
    const metadataCache = this.plugin.app.metadataCache;
    
    const content = await vault.cachedRead(file);
    const metadata = metadataCache.getFileCache(file) || {};
    
    const frontmatter = metadata.frontmatter || {};
    const tags = this.extractTags(frontmatter, content);
    const links = this.extractLinks(content, metadata);
    
    const stat = file.stat;
    
    return {
      path: file.path,
      name: file.name,
      extension: file.extension,
      content: content,
      frontmatter: frontmatter,
      mattermost: this.extractMattermostMetadata(frontmatter, stat.ctime),
      tags: tags,
      links: links,
      embeds: this.extractEmbeds(content),
      created: stat.ctime,
      modified: stat.mtime,
      size: stat.size
    };
  }

  private extractMattermostMetadata(frontmatter: Record<string, unknown>, created: number): MattermostMetadata | undefined {
    const dateField = frontmatter.date;

    if (!dateField) {
      return undefined;
    }

    if (typeof dateField === "string") {
      return { date: dateField };
    }
    if (dateField instanceof Date || typeof dateField === "number") {
      return { date: String(dateField) };
    }

    return undefined;
  }

  private extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
    const tags: string[] = [];
    
    if (Array.isArray(frontmatter.tags)) {
      tags.push(...frontmatter.tags.map(String));
    }
    
    if (typeof frontmatter.tags === "string") {
      tags.push(...(frontmatter.tags as string).split(",").map(t => t.trim()));
    }
    
    const inlineTagRegex = /#[\w\u0600-\uFFFF-]+/g;
    const inlineTags = content.match(inlineTagRegex) || [];
    tags.push(...inlineTags.map(t => t.slice(1)));
    
    return [...new Set(tags)];
  }

  private extractLinks(content: string, metadata: CachedMetadata): OutgoingLink[] {
    const links: OutgoingLink[] = [];
    
    const wikiLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const target = match[1]?.trim() ?? "";
      const displayText = match[2]?.trim();
      const linkText = match[0];
      
      if (linkText.startsWith("!") || content.substring(0, content.indexOf(linkText)).endsWith("!")) {
        links.push({
          target: target,
          originalText: match[0],
          displayText: displayText,
          type: "embed"
        });
      } else {
        links.push({
          target: target,
          originalText: match[0],
          displayText: displayText,
          type: "wiki"
        });
      }
    }
    
    const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = urlRegex.exec(content)) !== null) {
      const text = match[1]?.trim() ?? "";
      const url = match[2]?.trim() ?? "";
      
      if (!url.startsWith("file://") && !url.startsWith("#")) {
        links.push({
          target: url,
          originalText: match[0],
          displayText: text,
          type: url.startsWith("http") ? "url" : "asset"
        });
      }
    }
    
    return links;
  }

  private extractEmbeds(content: string): string[] {
    const embeds: string[] = [];
    const embedRegex = /!\[\[([^\]]+)\]\]/g;
    let match;
    
    while ((match = embedRegex.exec(content)) !== null) {
      const embedTarget = match[1];
      if (embedTarget) {
        embeds.push(embedTarget);
      }
    }
    
    return embeds;
  }

  private resolveLinkType(sourcePath: string, targetPath: string): "internal" | "external" | "broken" {
    if (!targetPath || typeof targetPath !== "string") return "broken";
    
    const vault = this.plugin.app.vault;
    
    if (targetPath.startsWith("http")) {
      return "external";
    }
    
    const normalizedTarget = this.normalizePath(sourcePath, targetPath);
    const targetFile = vault.getAbstractFileByPath(normalizedTarget);
    
    return targetFile ? "internal" : "broken";
  }

  private normalizePath(sourcePath: string, targetPath: string): string {
    if (!targetPath || typeof targetPath !== "string") return "";
    
    const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
    let normalized = targetPath;
    
    if (targetPath.startsWith("./")) {
      normalized = sourceFolder + targetPath.substring(1);
    } else if (!targetPath.startsWith("/")) {
      normalized = sourceFolder + "/" + targetPath;
    }
    
    normalized = normalized.replace(/\.md$/i, "");
    
    return normalized;
  }
}