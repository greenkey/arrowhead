import type ArrowheadPlugin from "../main";
import { validateOutputPath, resolveOutputPath, getRelativeOutputPath, type ValidationResult } from "../utils/path-utils";

export class FileExporter {
  private plugin: ArrowheadPlugin;

  constructor(plugin: ArrowheadPlugin) {
    this.plugin = plugin;
  }

  getVaultRootPath(): string {
    return this.plugin.getVaultRootPath();
  }

  getAbsoluteOutputPath(): string {
    const inputPath = this.plugin.settings.outputDirectory;
    const vaultRoot = this.getVaultRootPath();
    return resolveOutputPath(inputPath, vaultRoot);
  }

  getRelativeOutputPath(): string {
    const inputPath = this.plugin.settings.outputDirectory;
    const vaultRoot = this.getVaultRootPath();
    return getRelativeOutputPath(inputPath, vaultRoot);
  }

  validateOutputPath(): ValidationResult {
    const adapter = this.plugin.getAdapter();
    if (!adapter) {
      return { valid: false, resolvedPath: "", error: "Unable to access file system adapter" };
    }

    const vaultPath = this.getVaultRootPath();
    const inputPath = this.plugin.settings.outputDirectory;

    return validateOutputPath(inputPath, vaultPath);
  }
}