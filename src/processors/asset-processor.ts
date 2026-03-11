import ArrowheadPlugin from "../main";
import { VaultData, VaultFile } from "../utils/vault-walker";
import { PathResolver } from "../utils/path-resolver";
import { isAbsolutePath } from "../settings/settings";
import * as fs from "fs";
import * as path from "path";

export class AssetProcessor {
  private plugin: ArrowheadPlugin;
  private pathResolver: PathResolver;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
    this.pathResolver = new PathResolver(plugin);
  }

  processEmbeds(content: string, file: VaultFile, vaultData: VaultData): string {
    if (!this.plugin.settings.processEmbeds) {
      return content;
    }

    let processed = content;
    
    processed = this.processImageEmbeds(processed, file.path);
    processed = this.processNoteEmbeds(processed, file.path);
    processed = this.processAudioEmbeds(processed, file.path);
    processed = this.processVideoEmbeds(processed, file.path);
    
    return processed;
  }

  private processImageEmbeds(content: string, sourcePath: string): string {
    const imageEmbedRegex = /!\[\[([^]]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp))\]\]/gi;
    
    return content.replace(imageEmbedRegex, (match, imagePath) => {
      const assetUrl = this.pathResolver.resolveAssetPath(imagePath, sourcePath);
      const fileName = imagePath.substring(imagePath.lastIndexOf("/") + 1);
      
      return `<figure class="image-embed">
        <img src="${assetUrl}" alt="${fileName}" loading="lazy">
      </figure>`;
    });
  }

  private processNoteEmbeds(content: string, sourcePath: string): string {
    const noteEmbedRegex = /!\[\[([^]]+\.md)\]\]/gi;
    
    return content.replace(noteEmbedRegex, (match, notePath) => {
      const noteUrl = this.pathResolver.resolveToUrl(notePath, sourcePath);
      const fileName = notePath.substring(notePath.lastIndexOf("/") + 1);
      const displayName = fileName.replace(/\.md$/i, "").replace(/-/g, " ");
      
      return `<div class="note-embed" data-src="${noteUrl}">
        <p class="embed-caption">Embedded note: ${displayName}</p>
      </div>`;
    });
  }

  private processAudioEmbeds(content: string, sourcePath: string): string {
    const audioEmbedRegex = /!\[\[([^]]+\.(?:mp3|wav|ogg|m4a|aac))\]\]/gi;
    
    return content.replace(audioEmbedRegex, (match, audioPath) => {
      const assetUrl = this.pathResolver.resolveAssetPath(audioPath, sourcePath);
      const fileName = audioPath.substring(audioPath.lastIndexOf("/") + 1);
      
      return `<div class="audio-embed">
        <p>Audio: ${fileName}</p>
        <audio controls src="${assetUrl}">
          Your browser does not support the audio element.
        </audio>
      </div>`;
    });
  }

  private processVideoEmbeds(content: string, sourcePath: string): string {
    const videoEmbedRegex = /!\[\[([^]]+\.(?:mp4|webm|mov|avi))\]\]/gi;
    
    return content.replace(videoEmbedRegex, (match, videoPath) => {
      const assetUrl = this.pathResolver.resolveAssetPath(videoPath, sourcePath);
      const fileName = videoPath.substring(videoPath.lastIndexOf("/") + 1);
      
      return `<div class="video-embed">
        <p>Video: ${fileName}</p>
        <video controls width="100%" loading="lazy">
          <source src="${assetUrl}" type="video/${videoPath.split(".").pop()}">
          Your browser does not support the video tag.
        </video>
      </div>`;
    });
  }

  async copyAssets(vaultData: VaultData, outputPath: string): Promise<void> {
    if (!this.plugin.settings.includeAttachments) {
      return;
    }

    const assetsDir = `${outputPath}/assets`;
    
    for (const file of vaultData.attachments) {
      await this.copyAsset(file, outputPath);
    }
  }

  private async copyAsset(file: VaultFile, outputPath: string): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      const vaultRoot = this.plugin.getVaultRootPath();
      const isOutsideVault = isAbsolutePath(outputPath) && !outputPath.startsWith(vaultRoot);
      const targetPath = `${outputPath}/assets/${file.path}`;
      
      const pathParts = targetPath.split("/");
      pathParts.pop();
      const targetDir = pathParts.join("/");
      
      if (isOutsideVault) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        if (fs.existsSync(file.path)) {
          fs.copyFileSync(file.path, targetPath);
        }
      } else {
        try {
          await adapter.mkdir(targetDir);
        } catch {
        }
        
        if (await adapter.exists(file.path)) {
          await adapter.copy(file.path, targetPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to copy asset: ${file.path}`, error);
    }
  }
}