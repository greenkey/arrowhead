import ArrowheadPlugin from "../main";
import { isAbsolutePath, validateOutputPath } from "../settings/settings";
import * as path from "path";

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
    console.log(`[getAbsoluteOutputPath] Input: "${inputPath}"`);

    const expandedPath = inputPath.replace("~", process.env.HOME || "");

    if (isAbsolutePath(expandedPath)) {
      console.log(`[getAbsoluteOutputPath] Absolute: "${expandedPath}"`);
      return expandedPath;
    }

    const vaultRoot = this.getVaultRootPath();
    const absolutePath = path.join(vaultRoot, expandedPath);
    console.log(`[getAbsoluteOutputPath] Relative to absolute: "${absolutePath}"`);
    return absolutePath;
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
}