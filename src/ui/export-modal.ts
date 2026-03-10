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
        btn.setText("Generate Site");
        btn.setCta();
        btn.onClick(async () => {
          await this.generateSite();
        });
      })
      .addButton(btn => {
        btn.setText("Close");
        btn.onClick(() => {
          this.close();
        });
      });
  }

  private async generateSite() {
    this.statusEl.empty();
    this.statusEl.createEl("p", { text: "Generating site... Please wait." });
    
    try {
      await this.plugin.generateSite();
      this.statusEl.createEl("p", { 
        text: "Site generated successfully!",
        cls: "success-message"
      });
    } catch (error) {
      this.statusEl.createEl("p", { 
        text: `Error: ${error.message}`,
        cls: "error-message"
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}