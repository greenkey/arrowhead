import ArrowheadPlugin from "../main";
import { VaultData, VaultFile } from "../utils/vault-walker";
import { isAbsolutePath } from "../settings/settings";
import { TemplateEngine, TemplateData } from "../utils/template-engine";
import * as fs from "fs";
import * as path from "path";

export class SiteGenerator {
  private plugin: ArrowheadPlugin;
  private templateEngine: TemplateEngine;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
    this.templateEngine = new TemplateEngine(plugin);
  }

  async generate(vaultData: VaultData, outputPath: string): Promise<void> {
    console.log("[SiteGenerator.generate] Starting site generation...");
    console.log(`[SiteGenerator.generate] Files to process: ${vaultData.files.length}`);
    console.log(`[SiteGenerator.generate] Output path (should be vault-relative): "${outputPath}"`);

    await this.ensureBaseDirectory(outputPath);

    await this.clearOutputDirectory(outputPath);
    await this.copyTemplateAssets(outputPath);

    const startTime = Date.now();

    for (const file of vaultData.files) {
      await this.generatePage(file, vaultData, outputPath);
    }

    await this.generateIndexPage(vaultData, outputPath);

    if (this.plugin.settings.generateSitemap) {
      await this.generateSitemap(vaultData, outputPath);
    }

    if (this.plugin.settings.generateRobotsTxt) {
      await this.generateRobotsTxt(outputPath);
    }

    if (this.plugin.settings.includeAttachments) {
      await this.copyAttachments(vaultData.attachments, outputPath);
    }

    const elapsed = Date.now() - startTime;
    console.log(`Site generation completed in ${elapsed}ms`);
  }

  private removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\s*\n?/;
    const result = content.replace(frontmatterRegex, "");
    return result;
  }

  private async generatePage(fileData: VaultFile, vaultData: VaultData, outputPath: string): Promise<void> {
    const contentWithoutFrontmatter = this.removeFrontmatter(fileData.content);
    const contentWithLinks = this.processLinks(contentWithoutFrontmatter, fileData, vaultData);
    const processedEmbeds = this.processEmbeds(contentWithLinks, fileData, vaultData);

    const pageTitle = this.getTitle(fileData);
    const contentWithTitle = `<h1 class="page-title">${pageTitle}</h1>\n${processedEmbeds}`;

    const dateStr = fileData.mattermost?.date 
      ? fileData.mattermost.date 
      : new Date(fileData.created).toISOString();

    const html = await this.wrapInTemplate({
      title: pageTitle,
      content: contentWithTitle,
      frontmatter: fileData.frontmatter,
      date: dateStr,
      tags: fileData.tags,
      lastModified: new Date(fileData.modified).toISOString()
    }, vaultData);

    const relativePath = this.pathToUrl(fileData.path);
    const outputFilePath = this.getOutputPath(relativePath);

    await this.ensureDirectory(outputPath, outputFilePath);

    const fullPath = `${outputPath}/${outputFilePath}`;
    await this.writeFile(fullPath, html);

    console.log(`Generated: ${outputFilePath}`);
  }

  private processMarkdown(content: string): string {
    let processed = content;

    if (this.plugin.settings.processWikilinks) {
      processed = this.processWikiLinks(processed);
    }

    processed = this.processMarkdownSyntax(processed);

    return processed;
  }

  private processWikiLinks(content: string): string {
    return content.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, target, displayText) => {
      const url = this.wikiLinkToUrl(target);
      const text = displayText || target;
      return `<a href="${url}">${text}</a>`;
    });
  }

  private wikiLinkToUrl(wikiLink: string): string {
    let url = wikiLink;

    url = url.replace(/\s+/g, "-");
    url = url.toLowerCase();
    url = this.encodeUrlPath(url);

    url = `/${url}.html`;

    return url;
  }

  private encodeUrlPath(path: string): string {
    return path.split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }

  private processMarkdownSyntax(content: string): string {
    let processed = content;
    
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

  private replaceNewlinesOutsideHtml(content: string): string {
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

  private processLinks(content: string, file: VaultFile, vaultData: VaultData): string {
    const linkMap = new Map<string, string>();
    
    for (const link of file.links) {
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

  private processEmbeds(content: string, file: VaultFile, vaultData: VaultData): string {
    if (!this.plugin.settings.processEmbeds) {
      return this.processMarkdown(content);
    }

    let processed = this.processMarkdown(content);

    for (const embed of file.embeds) {
      if (embed.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const assetPath = this.embedToAssetPath(embed);
        const imgTag = `<img src="${assetPath}" alt="${embed}" loading="lazy">`;
        processed = processed.replace(`![[${embed}]]`, imgTag);
        processed = processed.replace(`![](${embed})`, imgTag);
      }
    }

    return processed;
  }

  private embedToAssetPath(embed: string): string {
    return `../assets/${embed}`;
  }

  private async wrapInTemplate(pageData: { title: string; content: string; frontmatter: Record<string, unknown>; date?: string; tags: string[]; lastModified: string }, vaultData?: VaultData): Promise<string> {
    const siteTitle = this.plugin.settings.siteTitle;
    const siteDescription = this.plugin.settings.siteDescription;

    const template = await this.templateEngine.loadTemplate("default");

    const pages = vaultData?.files
      .filter(file => file.pageType === 'page')
      .sort((a, b) => this.getTitle(a).localeCompare(this.getTitle(b)))
      .map(file => {
        const url = "/" + this.getOutputPath(this.pathToUrl(file.path));
        const title = this.getTitle(file);
        return { title, url };
      }) || [];

    const templateData: TemplateData = {
      title: pageData.title,
      content: pageData.content,
      description: pageData.frontmatter.description as string || siteDescription,
      date: pageData.date,
      tags: pageData.tags,
      lastModified: pageData.lastModified,
      siteTitle,
      siteDescription,
      pages
    };

    return await this.templateEngine.render(template, templateData);
  }

  private getAssetUrl(path: string): string {
    return `/assets/${path}`;
  }

  private getTitle(file: VaultFile): string {
    if (file.frontmatter.title) {
      return String(file.frontmatter.title);
    }
    
    return file.name.replace(/\.md$/i, "");
  }

private pathToUrl(path: string): string {
    let url = path.replace(/\.md$/i, "");
    url = url.replace(/\s+/g, "-");
    url = url.toLowerCase();
    url = this.encodeUrlPath(url);

    return url;
  }

  private getOutputPath(relativePath: string): string {
    return `${relativePath}.html`;
  }

  private async generateIndex(vaultData: VaultData, outputPath: string): Promise<void> {
    const indexContent = vaultData.files.map(file => {
      const url = "/" + this.getOutputPath(this.pathToUrl(file.path));
      const title = this.getTitle(file);
      return `<li><a href="${url}">${title}</a></li>`;
    }).join("\n");
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap | ${this.plugin.settings.siteTitle}</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header class="site-header">
    <nav class="site-nav">
      <a href="/" class="site-title">${this.plugin.settings.siteTitle}</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/sitemap">Sitemap</a></li>
      </ul>
    </nav>
  </header>
  
  <main class="site-content">
    <h1>All Pages</h1>
    <ul class="page-list">
      ${indexContent}
    </ul>
  </main>
  
  <footer class="site-footer">
    <p>Generated by Arrowhead Static Site Generator</p>
  </footer>
</body>
</html>`;
    
    const indexPath = `${outputPath}/sitemap.html`;

    await this.ensureDirectory(outputPath, "index.html");
    await this.writeFile(indexPath, html);
    console.log("Generated index/sitemap");
  }

  private async generateIndexPage(vaultData: VaultData, outputPath: string): Promise<void> {
    console.log("Generating main index.html page");
    console.log(`[generateIndexPage] Number of files: ${vaultData.files.length}`);
    
    const posts = vaultData.files
      .filter(file => file.pageType === 'post')
      .sort((a, b) => {
        const dateA = a.mattermost?.date ? new Date(a.mattermost.date).getTime() : a.created;
        const dateB = b.mattermost?.date ? new Date(b.mattermost.date).getTime() : b.created;
        return dateB - dateA;
      })
      .slice(0, Math.min(10, vaultData.files.filter(f => f.pageType === 'post').length))
      .map(file => {
        const url = "/" + this.getOutputPath(this.pathToUrl(file.path));
        const title = this.getTitle(file);
        const dateStr = file.mattermost?.date 
          ? file.mattermost.date 
          : new Date(file.created).toISOString();
        const date = dateStr.split("T")[0] || "";
        const tags = file.tags || [];
        const contentWithoutFrontmatter = this.removeFrontmatter(file.content);
        const excerpt = contentWithoutFrontmatter.substring(0, 150).replace(/[#*`\[\]]/g, "").trim();
        
        return { title, url, date, tags, excerpt };
      });
    
    const pages = vaultData.files
      .filter(file => file.pageType === 'page')
      .sort((a, b) => this.getTitle(a).localeCompare(this.getTitle(b)))
      .map(file => {
        const url = "/" + this.getOutputPath(this.pathToUrl(file.path));
        const title = this.getTitle(file);
        return { title, url };
      });
    
    let template = await this.loadIndexTemplate("default");
    
    const templateData: TemplateData = {
      title: this.plugin.settings.siteTitle,
      content: "",
      description: this.plugin.settings.siteDescription,
      siteTitle: this.plugin.settings.siteTitle,
      siteDescription: this.plugin.settings.siteDescription,
      posts,
      pages,
      isIndex: true
    };
    
    const html = await this.templateEngine.render(template, templateData);
    
    const indexPath = `${outputPath}/index.html`;
    await this.ensureDirectory(outputPath, "index.html");
    await this.writeFile(indexPath, html);
    console.log(`Generated index.html with ${posts.length} posts and ${pages.length} pages`);
  }

  private async loadIndexTemplate(templateName: string): Promise<string> {
    const indexTemplatePath = `templates/${templateName}/index.html`;
    
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(indexTemplatePath);
      if (file) {
        return await this.plugin.app.vault.cachedRead(file as any);
      }
    } catch (error) {
      console.log(`Custom index template not found: ${indexTemplatePath}`);
    }
    
    return this.getDefaultIndexTemplate();
  }

  private getDefaultIndexTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{#if description}}
  <meta name="description" content="{{description}}">
  {{/if}}
  <meta name="generator" content="Arrowhead Static Site Generator">
  <title>{{title}} | {{siteTitle}}</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header class="site-header">
    <nav class="site-nav">
      <a href="/" class="site-title">{{siteTitle}}</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        {{#if pages}}
        {{#each pages}}
        <li><a href="{{url}}">{{title}}</a></li>
        {{/each}}
        {{/if}}
      </ul>
    </nav>
  </header>

  <main class="site-content">
    <section class="hero">
      <h1>{{siteTitle}}</h1>
      {{#if siteDescription}}
      <p class="site-description">{{siteDescription}}</p>
      {{/if}}
    </section>

    {{#if posts}}
    <section class="recent-posts">
      <h2>Recent Posts</h2>
      <div class="posts-list">
        {{#each posts}}
        <article class="recent-post">
          <h3><a href="{{url}}">{{title}}</a></h3>
          <time datetime="{{date}}">{{date}}</time>
          {{#if excerpt}}
          <p class="excerpt">{{excerpt}}</p>
          {{/if}}
        </article>
        {{/each}}
      </div>
    </section>
    {{/if}}
  </main>

  <footer class="site-footer">
    <p>Generated by <a href="https://codeberg.org/greenkey/arrowhead">Arrowhead</a></p>
  </footer>
</body>
</html>`;
  }

  private async generateSitemap(vaultData: VaultData, outputPath: string): Promise<void> {
    const baseUrl = this.plugin.settings.siteUrl;
    const pages = vaultData.files.map(file => {
      const path = this.getOutputPath(this.pathToUrl(file.path));
      const dateStr = file.mattermost?.date 
        ? file.mattermost.date 
        : new Date(file.modified).toISOString();
      return `  <url>
    <loc>${baseUrl}/${path}</loc>
    <lastmod>${dateStr.split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join("\n");
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages}
</urlset>`;
    
    await this.ensureDirectory(outputPath, "sitemap.xml");
    await this.writeFile(`${outputPath}/sitemap.xml`, sitemap);
    console.log("Generated sitemap.xml");
  }

  private async generateRobotsTxt(outputPath: string): Promise<void> {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${this.plugin.settings.siteUrl}/sitemap.xml`;
    
    await this.ensureDirectory(outputPath, "robots.txt");
    await this.writeFile(`${outputPath}/robots.txt`, robotsTxt);
    console.log("Generated robots.txt");
  }

  private async copyAttachments(attachments: VaultFile[], outputPath: string): Promise<void> {
    const assetsPath = `${outputPath}/assets`;
    
    await this.ensureDirectory(outputPath, "assets");
    
    for (const attachment of attachments) {
      const targetPath = `${assetsPath}/${attachment.path}`;
      await this.ensureDirectory(assetsPath, attachment.path);
      
      try {
        const vault = this.plugin.app.vault;
        const vaultFile = vault.getAbstractFileByPath(attachment.path);
        if (vaultFile) {
          await vault.adapter.copy(attachment.path, targetPath);
        }
      } catch (error) {
        console.warn(`Failed to copy attachment: ${attachment.path}`);
      }
    }
    
    console.log(`Copied ${attachments.length} attachments`);
  }

  private async clearOutputDirectory(outputPath: string): Promise<void> {
    const vaultRoot = this.plugin.getVaultRootPath();
    const isOutsideVault = isAbsolutePath(outputPath) && !outputPath.startsWith(vaultRoot);

    console.log(`[clearOutputDirectory] Clearing: ${outputPath}, outsideVault: ${isOutsideVault}`);

    try {
      if (isOutsideVault) {
        if (fs.existsSync(outputPath)) {
          const files = fs.readdirSync(outputPath);
          for (const file of files) {
            const filePath = path.join(outputPath, file);
            if (fs.lstatSync(filePath).isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
          console.log("[clearOutputDirectory] Cleared with fs");
        }
      } else {
        const adapter = this.plugin.app.vault.adapter;
        const exists = await adapter.exists(outputPath);
        if (exists) {
          const entries = await adapter.list(outputPath);
          for (const file of entries.files) {
            await adapter.remove(file);
          }
          for (const folder of entries.folders) {
            await this.removeDirectoryRecursive(folder);
          }
          console.log("[clearOutputDirectory] Cleared with adapter");
        }
      }
    } catch (error) {
      console.warn("[clearOutputDirectory] Failed:", error);
    }
  }

  private async removeDirectoryRecursive(dirPath: string): Promise<void> {
    const adapter = this.plugin.app.vault.adapter;
    const entries = await adapter.list(dirPath);

    for (const file of entries.files) {
      await adapter.remove(file);
    }

    for (const folder of entries.folders) {
      await this.removeDirectoryRecursive(folder);
    }

    await adapter.rmdir(dirPath, true);
  }

  private async ensureBaseDirectory(outputPath: string): Promise<void> {
    console.log(`[ensureBaseDirectory] Ensuring directory: "${outputPath}"`);
    try {
      const adapter = this.plugin.app.vault.adapter;
      const vaultRoot = this.plugin.getVaultRootPath();
      const isOutsideVault = isAbsolutePath(outputPath) && !outputPath.startsWith(vaultRoot);

      console.log(`[ensureBaseDirectory] Checking if directory exists...`);
      
      if (isOutsideVault) {
        console.log(`[ensureBaseDirectory] Using Node.js fs for external directory`);
        const exists = fs.existsSync(outputPath);
        console.log(`[ensureBaseDirectory] Directory exists: ${exists}`);

        if (!exists) {
          console.log(`[ensureBaseDirectory] Creating directory with fs.mkdirSync...`);
          fs.mkdirSync(outputPath, { recursive: true });

          const verifyExists = fs.existsSync(outputPath);
          console.log(`[ensureBaseDirectory] After mkdir, directory exists: ${verifyExists}`);
        } else {
          console.log(`[ensureBaseDirectory] Directory already exists`);
        }
      } else {
        const exists = await adapter.exists(outputPath);
        console.log(`[ensureBaseDirectory] Directory exists: ${exists}`);

        if (!exists) {
          console.log(`[ensureBaseDirectory] Creating directory...`);
          await adapter.mkdir(outputPath);

          const verifyExists = await adapter.exists(outputPath);
          console.log(`[ensureBaseDirectory] After mkdir, directory exists: ${verifyExists}`);
        } else {
          console.log(`[ensureBaseDirectory] Directory already exists`);
        }
      }
    } catch (error) {
      console.error(`[ensureBaseDirectory] Failed: "${outputPath}"`, error);
      throw new Error(`Failed to create output directory: ${outputPath}. Error: ${error}`);
    }
  }

  private async ensureDirectory(basePath: string, relativePath: string): Promise<void> {
    const lastSlashIndex = relativePath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return;
    }

    const dirPart = relativePath.substring(0, lastSlashIndex);
    const fullPath = basePath ? `${basePath}/${dirPart}` : dirPart;

    console.log(`[ensureDirectory] Creating directory: "${fullPath}"`);

    if (!fullPath.endsWith(".html") && !fullPath.endsWith(".xml") && !fullPath.endsWith(".txt") && !fullPath.endsWith(".css") && !fullPath.endsWith(".js")) {
      const vaultRoot = this.plugin.getVaultRootPath();
      const isOutsideVault = isAbsolutePath(basePath) && !basePath.startsWith(vaultRoot);
      
      try {
        if (isOutsideVault) {
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
          }
        } else {
          await this.plugin.app.vault.adapter.mkdir(fullPath);
        }
      } catch (error) {
        console.warn(`[ensureDirectory] Failed to create directory: "${fullPath}"`, error);
      }
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const normalizedPath = filePath.replace(/\/+/g, "/");
    console.log(`[writeFile] Writing: ${normalizedPath} (${content.length} bytes)`);
    
    const vaultRoot = this.plugin.getVaultRootPath();
    const isOutsideVault = isAbsolutePath(normalizedPath) && !normalizedPath.startsWith(vaultRoot);
    
    try {
      if (isOutsideVault) {
        fs.writeFileSync(normalizedPath, content, "utf-8");
        const exists = fs.existsSync(normalizedPath);
        console.log(`[writeFile] Success (fs). File exists: ${exists}`);
        if (!exists) {
          console.warn(`[writeFile] Write reported success but file doesn't exist`);
        }
      } else {
        await this.plugin.app.vault.adapter.write(normalizedPath, content);

        const exists = await this.plugin.app.vault.adapter.exists(normalizedPath);
        console.log(`[writeFile] Success (adapter). File exists on adapter: ${exists}`);

        if (!exists) {
          console.warn(`[writeFile] Write reported success but file doesn't exist in adapter`);
        }
      }
    } catch (error) {
      console.error(`[writeFile] Failed: ${normalizedPath}`, error);
      throw error;
    }
  }

  private async copyTemplateAssets(outputPath: string): Promise<void> {
    const cssFileName = "styles.css";
    const assetsPath = `${outputPath}/assets`;

    try {
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      const cssContent = this.templateEngine.getDefaultCss();
      const targetPath = `${assetsPath}/${cssFileName}`;
      fs.writeFileSync(targetPath, cssContent, "utf-8");
      console.log(`[copyTemplateAssets] Copied CSS to ${targetPath}`);
    } catch (error) {
      console.warn(`[copyTemplateAssets] Failed to copy template CSS:`, error);
    }
  }
}