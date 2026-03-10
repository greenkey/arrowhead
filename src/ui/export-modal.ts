import { App, Modal, Notice, Setting } from "obsidian";
import ArrowheadPlugin from "../main";

export class ExportModal extends Modal {
  private plugin: ArrowheadPlugin;
  private statusEl: HTMLElement;

  constructor(app: App, plugin: ArrowheadPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    
    contentEl.createEl("h2", { text: "Export Static Site" });
    
    new Setting(contentEl)
      .setName("Output Directory")
      .setDesc("Files will be generated in this directory")
      .addText(text => {
        text.setValue(this.plugin.settings.outputDirectory);
        text.onChange(async (value) => {
          this.plugin.settings.outputDirectory = value;
          await this.plugin.saveSettings();
        });
      });
    
    new Setting(contentEl)
      .setName("Include All Notes")
      .setDesc("Export all notes in your vault")
      .addToggle(toggle => {
        toggle.setValue(true);
        toggle.setDisabled(true);
      });
    
    this.statusEl = contentEl.createEl("div", { cls: "export-status" });
    this.statusEl.createEl("p", { text: "Ready to generate your static site" });
    
    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("Generate Site");
        btn.setCta();
        btn.onClick(async () => {
          await this.runGeneration();
        });
      })
      .addButton(btn => {
        btn.setButtonText("Close");
        btn.onClick(() => {
          this.close();
        });
      });
  }

  private async runGeneration() {
    this.statusEl.empty();
    this.statusEl.createEl("p", { text: "Generating site... Please wait." });
    
    try {
      await this.plugin.generateSite();
      this.statusEl.createEl("p", { 
        text: "Site generated successfully!",
        cls: "success-message"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.statusEl.createEl("p", { 
        text: `Error: ${errorMessage}`,
        cls: "error-message"
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}