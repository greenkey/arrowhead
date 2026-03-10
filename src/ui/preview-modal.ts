import { App, Modal, Setting, Notice } from "obsidian";
import ArrowheadPlugin from "../main";
import { startServer, stopServer, getServerUrl, isServerRunning } from "../utils/preview-server";
import { FileExporter } from "../exporters/file-exporter";

export class PreviewModal extends Modal {
  private plugin: ArrowheadPlugin;
  private fileExporter: FileExporter;
  private autoRegenerateToggle: Setting | null = null;

  constructor(app: App, plugin: ArrowheadPlugin) {
    super(app);
    this.plugin = plugin;
    this.fileExporter = new FileExporter(plugin);
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.renderInterface(contentEl);
  }

  private async renderInterface(contentEl: HTMLElement): Promise<void> {
    contentEl.empty();
    
    contentEl.createEl("h2", { text: "Preview Settings" });

    const serverRunning = isServerRunning();
    const serverUrl = serverRunning ? getServerUrl() : "";

    new Setting(contentEl)
      .setName("Server Status")
      .setDesc(serverRunning ? `Running at ${serverUrl}` : "Not running")
      .addButton(btn => {
        if (serverRunning) {
          btn.setButtonText("Stop Server");
          btn.setCta();
          btn.onClick(async () => {
            await stopServer();
            this.plugin.updateRibbonIcon();
            this.renderInterface(contentEl);
          });
        } else {
          btn.setButtonText("Start Server");
          btn.onClick(async () => {
            await this.startPreviewServer();
            this.plugin.updateRibbonIcon();
            this.renderInterface(contentEl);
          });
        }
      });

    new Setting(contentEl)
      .setName("Open in Browser")
      .setDesc("Open the preview in your default browser")
      .addButton(btn => {
        btn.setButtonText("Open Browser");
        btn.onClick(() => {
          if (serverRunning) {
            window.open(serverUrl, "_blank");
          } else {
            new Notice("Start the server first");
          }
        });
      });

    contentEl.createEl("hr", { cls: "preview-divider" });

    new Setting(contentEl)
      .setName("Regenerate Website")
      .setDesc("Generate the static site from your vault")
      .addButton(btn => {
        btn.setButtonText("Generate Site");
        btn.onClick(async () => {
          await this.plugin.generateSite();
          new Notice("Site generated successfully");
        });
      });

    contentEl.createEl("hr", { cls: "preview-divider" });

    const autoRegenSetting = contentEl.createEl("div", { cls: "preview-setting" });
    new Setting(autoRegenSetting)
      .setName("Auto-regenerate on change")
      .setDesc("Automatically regenerate site when vault files change")
      .addToggle(toggle => {
        toggle.setValue(this.plugin.autoRegenerateEnabled);
        toggle.onChange(async (value) => {
          this.plugin.autoRegenerateEnabled = value;
        });
      });

    contentEl.createEl("hr", { cls: "preview-divider" });

    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("Close");
        btn.onClick(() => {
          this.close();
        });
      });
  }

  private async startPreviewServer(): Promise<void> {
    const fileExporter = new FileExporter(this.plugin);
    const validation = await fileExporter.validateOutputPath();
    
    if (!validation.valid) {
      new Notice(`Invalid output path: ${validation.error}`);
      return;
    }

    const outputPath = await fileExporter.getAbsoluteOutputPath();
    await startServer(outputPath, this.plugin.settings.previewServerPort);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
