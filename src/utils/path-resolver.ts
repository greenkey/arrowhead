import ArrowheadPlugin from "../main";
import { VaultData, VaultFile } from "./vault-walker";

export class PathResolver {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  resolveToUrl(wikiLink: string, sourcePath: string): string {
    let targetPath = wikiLink;
    
    if (targetPath.startsWith("./")) {
      const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
      targetPath = sourceDir + targetPath.substring(1);
    } else if (!targetPath.startsWith("/") && !targetPath.includes("://")) {
      const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
      targetPath = sourceDir + "/" + targetPath;
    }
    
    targetPath = targetPath.replace(/\.md$/i, "");
    targetPath = targetPath.replace(/index$/i, "");
    
    targetPath = targetPath.split("/").map(segment => {
      return segment.toLowerCase().replace(/\s+/g, "-");
    }).join("/");
    
    return "/" + targetPath + ".html";
  }

  resolveToPath(wikiLink: string, sourcePath: string): string {
    const url = this.resolveToUrl(wikiLink, sourcePath);
    return url.replace(/\/$/, "").replace(/\.html$/, "") + ".md";
  }

  resolveAssetPath(embed: string, sourcePath: string): string {
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
    let assetPath = embed;
    
    if (!embed.includes("/")) {
      assetPath = sourceDir + "/" + embed;
    }
    
    return "/assets/" + assetPath;
  }

  isInternalLink(target: string): boolean {
    return !target.startsWith("http") && 
           !target.startsWith("https") && 
           !target.startsWith("mailto:") &&
           !target.startsWith("#");
  }

  getLinkType(target: string): "internal" | "external" | "anchor" | "asset" {
    if (target.startsWith("#")) {
      return "anchor";
    }
    if (target.startsWith("http") || target.startsWith("https")) {
      return "external";
    }
    if (target.includes("://")) {
      return "external";
    }
    if (this.isAttachment(target)) {
      return "asset";
    }
    return "internal";
  }

  isAttachment(path: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
    const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a"];
    const videoExtensions = [".mp4", ".webm", ".mov"];
    
    const ext = path.toLowerCase();
    return imageExtensions.some(e => ext.endsWith(e)) ||
           audioExtensions.some(e => ext.endsWith(e)) ||
           videoExtensions.some(e => ext.endsWith(e));
  }
}