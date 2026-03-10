import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFolder, FileSystemAdapter, Workspace } from "obsidian";
import { ArrowheadSettingTab, DEFAULT_SETTINGS } from "./settings/settings";
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
    
    console.log("Arrowhead Static Site Generator loaded successfully");
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

  private async generateSite(): Promise<void> {
    if (this.generationInProgress) {
      new Notice("Site generation already in progress");
      return;
    }

    this.generationInProgress = true;
    new Notice("Generating static site...");

    try {
      const outputPath = await this.fileExporter.getAbsoluteOutputPath();
      const siteData = await this.vaultWalker.collectVaultData();
      
      await this.siteGenerator.generate(siteData, outputPath);
      
      new Notice(`Static site generated successfully!\nOutput: ${outputPath}`);
    } catch (error) {
      console.error("Site generation failed:", error);
      new Notice(`Failed to generate site: ${error.message}`);
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
    if (this.app.vault.adapter instanceof FileSystemAdapter) {
      return this.app.vault.adapter;
    }
    return null;
  }
}