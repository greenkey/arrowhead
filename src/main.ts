import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFolder, FileSystemAdapter, Workspace } from "obsidian";
import { ArrowheadSettingTab } from "./settings/settings-tab";
import { DEFAULT_SETTINGS, ArrowheadSettings } from "./settings/settings";
import { SiteGenerator } from "./generators/site-generator";
import { FileExporter } from "./exporters/file-exporter";
import { VaultWalker } from "./utils/vault-walker";
import { startServer, stopServer, getServerUrl, isServerRunning, beforeFirstGeneration } from "./utils/preview-server";

export default class ArrowheadPlugin extends Plugin {
  settings: typeof DEFAULT_SETTINGS;
  private siteGenerator: SiteGenerator;
  public fileExporter: FileExporter;
  private vaultWalker: VaultWalker;
  private generationInProgress: boolean = false;
  private previewRibbonIcon: HTMLElement | null = null;
  private liveModeRibbonIcon: HTMLElement | null = null;
  private stoppingInProgress: boolean = false;

  async onload() {
    await this.loadSettings();
    
    this.siteGenerator = new SiteGenerator(this);
    this.fileExporter = new FileExporter(this);
    this.vaultWalker = new VaultWalker(this);

    this.previewRibbonIcon = this.addRibbonIcon("eye", "Open Preview", async () => {
      await this.openPreview();
    });

    this.liveModeRibbonIcon = this.addRibbonIcon("cloud", "Live Mode", async () => {
      await this.toggleLiveMode();
    });

    this.updateLiveModeIcon();

    this.addRibbonIcon("gear", "Arrowhead Settings", () => {
      const app = this.app as unknown as { setting: { open(): void; openTabById(id: string): void } };
      app.setting.open();
      app.setting.openTabById("arrowhead-obsidian-plugin");
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
        await this.openPreview();
      }
    });

    this.addSettingTab(new ArrowheadSettingTab(this.app, this));

    this.registerVaultEvents();

    const manifest = this.manifest || { version: "unknown" };
    console.log(`Arrowhead Static Site Generator v${manifest.version} loaded successfully`);
    console.log(`[Arrowhead] Vault: ${this.app.vault.getName()}`);
    console.log(`[Arrowhead] Vault root: ${this.getVaultRootPath()}`);
  }

  public updateLiveModeIcon(): void {
    if (!this.liveModeRibbonIcon) return;
    
    const isLive = isServerRunning() && this.settings.autoRegenerate;
    
    if (isLive) {
      this.liveModeRibbonIcon.setAttribute("aria-label", "Live Mode Active - Click to Stop");
      this.liveModeRibbonIcon.style.color = "var(--text-success)";
    } else {
      this.liveModeRibbonIcon.setAttribute("aria-label", "Live Mode Inactive - Click to Start");
      this.liveModeRibbonIcon.style.color = "";
    }
  }

  private async openPreview(): Promise<void> {
    const fileExporter = new FileExporter(this);

    const validation = await fileExporter.validateOutputPath();
    if (!validation.valid) {
      new Notice(`Invalid output path: ${validation.error}`);
      return;
    }

    const outputPath = await fileExporter.getAbsoluteOutputPath();

    if (!isServerRunning()) {
      await startServer(outputPath, this.settings.previewServerPort);
      this.updateLiveModeIcon();
      await this.generateSite();
    }

    if (!this.settings.autoRegenerate) {
      this.settings.autoRegenerate = true;
      await this.saveSettings();
      this.updateLiveModeIcon();
    }

    const url = getServerUrl();
    window.open(url, "_blank");
    new Notice(`Preview opened at ${url}`);
  }

  private async toggleLiveMode(): Promise<void> {
    if (this.stoppingInProgress) return;
    
    const isLive = isServerRunning() && this.settings.autoRegenerate;
    
    if (isLive) {
      this.stoppingInProgress = true;
      this.settings.autoRegenerate = false;
      await this.saveSettings();
      await stopServer();
      this.stoppingInProgress = false;
      this.updateLiveModeIcon();
      new Notice("Live mode stopped");
    } else {
      const fileExporter = new FileExporter(this);
      
      const validation = await fileExporter.validateOutputPath();
      if (!validation.valid) {
        new Notice(`Invalid output path: ${validation.error}`);
        return;
      }

      const outputPath = await fileExporter.getAbsoluteOutputPath();
      await startServer(outputPath, this.settings.previewServerPort);
      this.settings.autoRegenerate = true;
      await this.saveSettings();
      this.updateLiveModeIcon();
      await this.generateSite();
      new Notice(`Live mode started at ${getServerUrl()}`);
    }
  }

  onunload() {
    stopServer();
    console.log("Arrowhead Static Site Generator unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
    if (this.settings.siteTitle === DEFAULT_SETTINGS.siteTitle) {
      this.settings.siteTitle = this.app.vault.getName();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async generateSite(isAutoRegenerate: boolean = false): Promise<void> {
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

    await this.fileExporter.clearOutputDirectory();

    this.generationInProgress = true;
    if (!isAutoRegenerate) {
      new Notice("Generating static site...");
    }

    try {
      const outputPath = await this.fileExporter.getAbsoluteOutputPath();
      const relativeOutputPath = this.fileExporter.getRelativeOutputPath();

      console.log(`[generateSite] Absolute path (for display): ${outputPath}`);
      console.log(`[generateSite] Relative path (for adapter): "${relativeOutputPath}"`);

      const siteData = await this.vaultWalker.collectVaultData();
      console.log(`[generateSite] Collected ${siteData.files.length} files from vault`);

      await this.siteGenerator.generate(siteData, relativeOutputPath);
      console.log("[generateSite] After siteGenerator.generate");

      if (!isAutoRegenerate) {
        new Notice(`Static site is synced on ${outputPath}`);
      }
    } catch (error) {
      console.error("Site generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to generate site: ${errorMessage}`);
    } finally {
      this.generationInProgress = false;
    }
  }

  private async exportArchive(): Promise<void> {
    new Notice("Archive export functionality coming soon!");
  }

  private debounceTimer: NodeJS.Timeout | null = null;

  private registerVaultEvents(): void {
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (this.settings.autoRegenerate && isServerRunning() && file.name.endsWith(".md")) {
        console.log(`File modified: ${file.path}, auto-regenerating...`);
        
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(async () => {
          await this.generateSite(true);
        }, 1000);
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