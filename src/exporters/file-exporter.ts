import ArrowheadPlugin from "../main";
import { isAbsolutePath, validateOutputPath } from "../settings/settings";

export class FileExporter {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  getVaultRootPath(): string {
    return this.plugin.getVaultRootPath();
  }

  async getAbsoluteOutputPath(): Promise<string> {
    const inputPath = this.plugin.settings.outputDirectory;
    const vaultRoot = this.getVaultRootPath();

    console.log(`[getAbsoluteOutputPath] Input: "${inputPath}", Vault root: "${vaultRoot}"`);

    if (isAbsolutePath(inputPath)) {
      const expandedPath = inputPath.replace("~", process.env.HOME || "");
      if (expandedPath.startsWith(vaultRoot)) {
        return expandedPath;
      }
      return expandedPath;
    }

    return `${vaultRoot}/${inputPath}`;
  }

  getRelativeOutputPath(): string {
    const inputPath = this.plugin.settings.outputDirectory;
    console.log(`[getRelativeOutputPath] Input: "${inputPath}"`);

    if (isAbsolutePath(inputPath)) {
      const vaultRoot = this.getVaultRootPath();
      const expandedPath = inputPath.replace("~", process.env.HOME || "");

      if (expandedPath.startsWith(vaultRoot)) {
        const relative = expandedPath.substring(vaultRoot.length);
        console.log(`[getRelativeOutputPath] Absolute to relative: "${relative}"`);
        return relative;
      }

      console.log(`[getRelativeOutputPath] Absolute path outside vault: "${expandedPath}"`);
      return expandedPath;
    }

    console.log(`[getRelativeOutputPath] Already relative: "${inputPath}"`);
    return inputPath;
  }

  async validateOutputPath(): Promise<{ valid: boolean; resolvedPath: string; error?: string }> {
    const adapter = this.plugin.getAdapter();
    if (!adapter) {
      return { valid: false, resolvedPath: "", error: "Unable to access file system adapter" };
    }

    const vaultPath = this.getVaultRootPath();
    const inputPath = this.plugin.settings.outputDirectory;

    return validateOutputPath(inputPath, vaultPath);
  }

  async clearOutputDirectory(): Promise<void> {
    const outputPath = await this.getAbsoluteOutputPath();
    
    try {
      const adapter = this.plugin.app.vault.adapter;
      
      if (await this.directoryExists(outputPath)) {
        const files = await this.listFilesRecursive(outputPath);
        
        for (const file of files) {
          try {
            await adapter.remove(file);
          } catch (e) {
          }
        }
        
        const dirs = await this.listDirectoriesRecursive(outputPath);
        for (const dir of dirs) {
          try {
            await adapter.rmdir(dir, true);
          } catch (e) {
          }
        }
      }
    } catch (error) {
      console.warn("Could not clear output directory:", error);
    }
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      return await adapter.exists(path);
    } catch {
      return false;
    }
  }

  async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const adapter = this.plugin.app.vault.adapter;
    
    try {
      const entries = await adapter.list(dir);
      
      for (const entry of entries.files) {
        files.push(entry);
      }
      
      for (const subdir of entries.folders) {
        files.push(...await this.listFilesRecursive(subdir));
      }
    } catch {
      return files;
    }
    
    return files;
  }

  async listDirectoriesRecursive(dir: string): Promise<string[]> {
    const dirs: string[] = [];
    const adapter = this.plugin.app.vault.adapter;
    
    try {
      const entries = await adapter.list(dir);
      
      for (const subdir of entries.folders) {
        dirs.push(subdir);
        dirs.push(...await this.listDirectoriesRecursive(subdir));
      }
    } catch {
      return dirs;
    }
    
    return dirs;
  }

  async createArchive(): Promise<Blob> {
    throw new Error("Archive creation not yet implemented");
  }
}