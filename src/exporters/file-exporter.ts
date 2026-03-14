import type ArrowheadPlugin from "../main";
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

  getAbsoluteOutputPath(): Promise<string> {
    const inputPath = this.plugin.settings.outputDirectory;

    const expandedPath = inputPath.replace("~", process.env.HOME || "");

    if (isAbsolutePath(expandedPath)) {
      return Promise.resolve(expandedPath);
    }

    const vaultRoot = this.getVaultRootPath();
    const absolutePath = path.join(vaultRoot, expandedPath);
    return Promise.resolve(absolutePath);
  }

  getRelativeOutputPath(): string {
    const inputPath = this.plugin.settings.outputDirectory;

    if (isAbsolutePath(inputPath)) {
      const vaultRoot = this.getVaultRootPath();
      const expandedPath = inputPath.replace("~", process.env.HOME || "");

      if (expandedPath.startsWith(vaultRoot)) {
        const relative = expandedPath.substring(vaultRoot.length);
        return relative;
      }

      return expandedPath;
    }

    return inputPath;
  }

  validateOutputPath(): Promise<{ valid: boolean; resolvedPath: string; error?: string }> {
    const adapter = this.plugin.getAdapter();
    if (!adapter) {
      return Promise.resolve({ valid: false, resolvedPath: "", error: "Unable to access file system adapter" });
    }

    const vaultPath = this.getVaultRootPath();
    const inputPath = this.plugin.settings.outputDirectory;

    return Promise.resolve(validateOutputPath(inputPath, vaultPath));
  }
}