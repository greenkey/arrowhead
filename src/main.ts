import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFolder, FileSystemAdapter, Workspace } from "obsidian";
import { ArrowheadSettingTab } from "./settings/settings-tab";
import { DEFAULT_SETTINGS, ArrowheadSettings } from "./settings/settings";
import { SiteGenerator } from "./generators/site-generator";
import { FileExporter } from "./exporters/file-exporter";
import { VaultWalker } from "./utils/vault-walker";

export default class ArrowheadPlugin extends Plugin {
  settings: typeof DEFAULT_SETTINGS;
  private siteGenerator: SiteGenerator;
  private fileExporter: FileExporter;
  private vaultWalker: VaultWalker;
  private generationInProgress: boolean = false;

  async onload() {
    await this.loadSettings();
    
    this.siteGenerator = new SiteGenerator(this);
    this.fileExporter = new FileExporter(this);
    this.vaultWalker = new VaultWalker(this);

    this.addRibbonIcon("download", "Generate Static Site", async () => {
      await this.generateSite();
    });

    this.addCommand({
      id: "generate-static-site",
      name: "Generate Static Site",
      callback: async () => {
        await this.generateSite();
      }
    });

    this.addCommand({
      id: "generate-site-preview",
      name: "Preview Generated Site",
      callback: async () => {
        await this.previewSite();
      }
    });

    this.addCommand({
      id: "export-site-archive",
      name: "Export Site as ZIP",
      callback: async () => {
        await this.exportArchive();
      }
    });

    this.addSettingTab(new ArrowheadSettingTab(this.app, this));

    this.registerVaultEvents();

    const manifest = this.manifest || { version: "unknown" };
    console.log(`Arrowhead Static Site Generator v${manifest.version} loaded successfully`);
    console.log(`[Arrowhead] Vault: ${this.app.vault.getName()}`);
    console.log(`[Arrowhead] Vault root: ${this.getVaultRootPath()}`);
  }

  onunload() {
    console.log("Arrowhead Static Site Generator unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async generateSite(): Promise<void> {
    if (this.generationInProgress) {
      new Notice("Site generation already in progress");
      return;
    }

    console.log("[generateSite] Starting site generation");
    console.log(`[generateSite] Current outputDirectory setting: "${this.settings.outputDirectory}"`);

    const validation = await this.fileExporter.validateOutputPath();
    console.log(`[generateSite] Validation result: ${JSON.stringify(validation)}`);

    if (!validation.valid) {
      new Notice(`Invalid output path: ${validation.error}`);
      return;
    }

    this.generationInProgress = true;
    new Notice("Generating static site...");

    try {
      const outputPath = await this.fileExporter.getAbsoluteOutputPath();
      const relativeOutputPath = this.fileExporter.getRelativeOutputPath();

      console.log(`[generateSite] Absolute path (for display): ${outputPath}`);
      console.log(`[generateSite] Relative path (for adapter): "${relativeOutputPath}"`);

      const siteData = await this.vaultWalker.collectVaultData();
      console.log(`[generateSite] Collected ${siteData.files.length} files from vault`);

      await this.siteGenerator.generate(siteData, relativeOutputPath);

      new Notice(`Static site generated successfully!\nLocation: ${outputPath}`);
    } catch (error) {
      console.error("Site generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to generate site: ${errorMessage}`);
    } finally {
      this.generationInProgress = false;
    }
  }

  private async previewSite(): Promise<void> {
    new Notice("Preview functionality coming soon!");
  }

  private async exportArchive(): Promise<void> {
    new Notice("Archive export functionality coming soon!");
  }

  private registerVaultEvents(): void {
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (this.settings.generateIndex && file.name.endsWith(".md")) {
        console.log(`File modified: ${file.path}`);
      }
    }));

    this.registerEvent(this.app.vault.on("delete", (file) => {
      console.log(`File deleted: ${file.path}`);
    }));

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      console.log(`File renamed: ${oldPath} -> ${file.path}`);
    }));
  }

  getAdapter(): FileSystemAdapter | null {
    const adapter = this.app.vault.adapter;
    if (!adapter) {
      console.error("[getAdapter] No adapter available");
      return null;
    }

    if (adapter instanceof FileSystemAdapter) {
      return adapter;
    }

    console.log("[getAdapter] Adapter is not FileSystemAdapter, attempting to use as-is");
    return adapter as unknown as FileSystemAdapter;
  }

  getVaultRootPath(): string {
    const adapter = this.getAdapter();
    if (!adapter) {
      throw new Error("Unable to access file system adapter");
    }

    const basePath = adapter.getBasePath();
    const vaultName = this.app.vault.getName();

    console.log(`[getVaultRootPath] basePath from adapter: "${basePath}"`);
    console.log(`[getVaultRootPath] vault name: "${vaultName}"`);

    if (basePath.endsWith(vaultName)) {
      console.log(`[getVaultRootPath] ✓ basePath ends with vaultName, returning as-is`);
      return basePath;
    }

    const potentialPath = `${basePath}/${vaultName}`;
    console.log(`[getVaultRootPath] ✗ basePath doesn't end with vaultName`);
    console.log(`[getVaultRootPath] Computed path: ${potentialPath}`);

    if (basePath === "/") {
      console.log(`[getVaultRootPath] basePath is root, returning vaultName directly`);
      return vaultName;
    }

    console.log(`[getVaultRootPath] Returning computed path: ${potentialPath}`);
    return potentialPath;
  }
}