import ArrowheadPlugin from "../main";

export class FileExporter {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  async getAbsoluteOutputPath(): Promise<string> {
    const adapter = this.plugin.getAdapter();
    if (!adapter) {
      throw new Error("Unable to access file system adapter");
    }

    const vaultPath = adapter.getBasePath();
    const relativePath = this.plugin.settings.outputDirectory;
    
    return `${vaultPath}/${relativePath}`;
  }

  async clearOutputDirectory(): Promise<void> {
    const outputPath = await this.getAbsoluteOutputPath();
    
    try {
      const adapter = this.plugin.app.vault.adapter;
      
      if (await this.directoryExists(outputPath)) {
        const files = await this.listFilesRecursive(outputPath);
        
        for (const file of files) {
          await adapter.rm(file);
        }
        
        const dirs = await this.listDirectoriesRecursive(outputPath);
        for (const dir of dirs) {
          try {
            await adapter.rmdir(dir);
          } catch (error) {
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