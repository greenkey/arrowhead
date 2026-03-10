import ArrowheadPlugin from "../main";
import { VaultData, VaultFile } from "../utils/vault-walker";

export class SiteGenerator {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  async generate(vaultData: VaultData, outputPath: string): Promise<void> {
    console.log("[SiteGenerator.generate] Starting site generation...");
    console.log(`[SiteGenerator.generate] Files to process: ${vaultData.files.length}`);
    console.log(`[SiteGenerator.generate] Output path (should be vault-relative): "${outputPath}"`);

    await this.ensureBaseDirectory(outputPath);

    const startTime = Date.now();
    
    for (const file of vaultData.files) {
      await this.generatePage(file, vaultData, outputPath);
    }
    
    if (this.plugin.settings.generateIndex) {
      await this.generateIndex(vaultData, outputPath);
    }
    
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

  private async generatePage(fileData: VaultFile, vaultData: VaultData, outputPath: string): Promise<void> {
    const pageContent = this.processMarkdown(fileData.content);
    const processedLinks = this.processLinks(fileData, vaultData);
    const processedEmbeds = this.processEmbeds(fileData, vaultData);
    
    const html = this.wrapInTemplate({
      title: this.getTitle(fileData),
      content: processedEmbeds,
      frontmatter: fileData.frontmatter,
      tags: fileData.tags,
      lastModified: new Date(fileData.modified).toISOString()
    });
    
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
    processed = processed.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
    
    processed = processed.replace(/\n/g, "<br>");
    
    return processed;
  }

  private processLinks(file: VaultFile, vaultData: VaultData): string {
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
    
    let content = file.content;
    for (const [original, replacement] of linkMap) {
      content = content.replace(original, replacement);
    }
    
    return content;
  }

  private processEmbeds(file: VaultFile, vaultData: VaultData): string {
    let content = this.processMarkdown(file.content);
    
    for (const embed of file.embeds) {
      if (embed.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const assetPath = this.embedToAssetPath(embed);
        const imgTag = `<img src="${assetPath}" alt="${embed}" loading="lazy">`;
        content = content.replace(`![[${embed}]]`, imgTag);
      } else if (embed.match(/\.md$/i)) {
        const link = this.embedToPageLink(embed);
        const embedTag = `<div class="embed" data-src="${link}"></div>`;
        content = content.replace(`![[${embed}]]`, embedTag);
      }
    }
    
    return content;
  }

  private embedToAssetPath(embed: string): string {
    return `../assets/${embed}`;
  }

  private embedToPageLink(embed: string): string {
    return this.wikiLinkToUrl(embed.replace(/\.md$/i, ""));
  }

  private wrapInTemplate(pageData: { title: string; content: string; frontmatter: Record<string, unknown>; tags: string[]; lastModified: string }): string {
    const siteTitle = this.plugin.settings.siteTitle;
    const siteDescription = this.plugin.settings.siteDescription;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${siteDescription}">
  <meta name="generator" content="Arrowhead Static Site Generator">
  <title>${pageData.title} | ${siteTitle}</title>
  <link rel="stylesheet" href="${this.getAssetUrl("styles.css")}">
  ${this.plugin.settings.customCssPath ? `<link rel="stylesheet" href="${this.getAssetUrl(this.plugin.settings.customCssPath)}">` : ""}
  <script src="${this.getAssetUrl("main.js")}"></script>
  ${this.plugin.settings.customJsPath ? `<script src="${this.getAssetUrl(this.plugin.settings.customJsPath)}"></script>` : ""}
</head>
<body>
  <header class="site-header">
    <nav class="site-nav">
      <a href="/" class="site-title">${siteTitle}</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/sitemap">Sitemap</a></li>
      </ul>
    </nav>
  </header>
  
  <main class="site-content">
    ${pageData.content}
  </main>
  
  <footer class="site-footer">
    <p>Generated by <a href="https://github.com/yourusername/arrowhead-obsidian-plugin">Arrowhead</a></p>
    <p>Last updated: ${new Date(pageData.lastModified).toLocaleDateString()}</p>
  </footer>
</body>
</html>`;
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

  private async generateSitemap(vaultData: VaultData, outputPath: string): Promise<void> {
    const baseUrl = this.plugin.settings.siteUrl;
    const pages = vaultData.files.map(file => {
      const path = this.getOutputPath(this.pathToUrl(file.path));
      return `  <url>
    <loc>${baseUrl}/${path}</loc>
    <lastmod>${new Date(file.modified).toISOString().split("T")[0]}</lastmod>
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

  private async ensureBaseDirectory(outputPath: string): Promise<void> {
    console.log(`[ensureBaseDirectory] Ensuring directory: "${outputPath}"`);
    try {
      const adapter = this.plugin.app.vault.adapter;

      console.log(`[ensureBaseDirectory] Checking if directory exists...`);
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
      try {
        await this.plugin.app.vault.adapter.mkdir(fullPath);
      } catch (error) {
        console.warn(`[ensureDirectory] Failed to create directory: "${fullPath}"`, error);
      }
    }
  }

  private async writeFile(path: string, content: string): Promise<void> {
    const normalizedPath = path.replace(/\/+/g, "/");
    console.log(`[writeFile] Writing: ${normalizedPath} (${content.length} bytes)`);
    try {
      await this.plugin.app.vault.adapter.write(normalizedPath, content);

      const exists = await this.plugin.app.vault.adapter.exists(normalizedPath);
      console.log(`[writeFile] Success. File exists on adapter: ${exists}`);

      if (!exists) {
        console.warn(`[writeFile] Write reported success but file doesn't exist in adapter`);
      }
    } catch (error) {
      console.error(`[writeFile] Failed: ${normalizedPath}`, error);
      throw error;
    }
  }
}