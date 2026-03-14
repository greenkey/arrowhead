import { Notice, Plugin, FileSystemAdapter } from "obsidian";
import { ArrowheadSettingTab } from "./settings/settings-tab";
import { DEFAULT_SETTINGS } from "./settings/settings";
import { SiteGenerator } from "./generators/site-generator";
import { FileExporter } from "./exporters/file-exporter";
import { VaultWalker } from "./utils/vault-walker";
import { startServer, stopServer, getServerUrl, isServerRunning } from "./utils/preview-server";

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

    this.previewRibbonIcon = this.addRibbonIcon("eye", "Open preview", async () => {
      await this.openPreview();
    });

    this.liveModeRibbonIcon = this.addRibbonIcon("cloud", "Live mode", async () => {
      await this.toggleLiveMode();
    });

    this.updateLiveModeIcon();

    this.addRibbonIcon("gear", "Arrowhead settings", () => {
      const app = this.app as unknown as { setting: { open(): void; openTabById(id: string): void } };
      app.setting.open();
      app.setting.openTabById("arrowhead-obsidian-plugin");
    });

    this.addCommand({
      id: "generate-static-site",
      name: "Generate static site",
      callback: async () => {
        await this.generateSite();
      }
    });

    this.addCommand({
      id: "generate-site-preview",
      name: "Preview generated site",
      callback: async () => {
        await this.openPreview();
      }
    });

    this.addSettingTab(new ArrowheadSettingTab(this.app, this));

    this.registerVaultEvents();
  }

  public updateLiveModeIcon(): void {
    if (!this.liveModeRibbonIcon) return;
    
    const isLive = isServerRunning() && this.settings.autoRegenerate;
    
    if (isLive) {
      this.liveModeRibbonIcon.setAttribute("aria-label", "Live mode active - click to stop");
      this.liveModeRibbonIcon.addClass("live-mode-active");
    } else {
      this.liveModeRibbonIcon.setAttribute("aria-label", "Live mode inactive - click to start");
      this.liveModeRibbonIcon.removeClass("live-mode-active");
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
    void stopServer();
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

    const validation = await this.fileExporter.validateOutputPath();

    if (!validation.valid) {
      new Notice(`Invalid output path: ${validation.error}`);
      return;
    }

    this.generationInProgress = true;
    if (!isAutoRegenerate) {
      new Notice("Generating static site...");
    }

    try {
      const outputPath = await this.fileExporter.getAbsoluteOutputPath();
      const relativeOutputPath = this.fileExporter.getRelativeOutputPath();

      const siteData = await this.vaultWalker.collectVaultData();

      await this.siteGenerator.generate(siteData, relativeOutputPath);

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

  private exportArchive(): void {
    new Notice("Archive export functionality coming soon!");
  }

  private debounceTimer: NodeJS.Timeout | null = null;

  private registerVaultEvents(): void {
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (this.settings.autoRegenerate && isServerRunning() && file.name.endsWith(".md")) {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
          void this.generateSite(true);
        }, 1000);
      }
    }));

    this.registerEvent(this.app.vault.on("delete", (_file) => {
    }));

    this.registerEvent(this.app.vault.on("rename", (_file, _oldPath) => {
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

    return adapter as unknown as FileSystemAdapter;
  }

  getVaultRootPath(): string {
    const adapter = this.getAdapter();
    if (!adapter) {
      throw new Error("Unable to access file system adapter");
    }

    const basePath = adapter.getBasePath();
    const vaultName = this.app.vault.getName();

    if (basePath.endsWith(vaultName)) {
      return basePath;
    }

    const potentialPath = `${basePath}/${vaultName}`;

    if (basePath === "/") {
      return vaultName;
    }

    return potentialPath;
  }
}