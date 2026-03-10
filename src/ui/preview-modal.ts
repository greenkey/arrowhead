import { App, Modal, Setting } from "obsidian";
import ArrowheadPlugin from "../main";

export class PreviewModal extends Modal {
  private plugin: ArrowheadPlugin;

  constructor(app: App, plugin: ArrowheadPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    
    contentEl.createEl("h2", { text: "Preview Generated Site" });
    
    contentEl.createEl("p", { 
      text: "Preview functionality allows you to view your generated site within Obsidian before exporting." 
    });
    
    contentEl.createEl("div", { cls: "preview-info" }, div => {
      div.createEl("h3", { text: "Features" });
      div.createEl("ul", {}, ul => {
        ul.createEl("li", { text: "View rendered HTML pages" });
        ul.createEl("li", { text: "Test links and navigation" });
        ul.createEl("li", { text: "Verify images and assets" });
        ul.createEl("li", { text: "Check template rendering" });
      });
    });
    
    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("Open Preview (Coming Soon)");
        btn.setDisabled(true);
        btn.buttonEl.addClass("coming-soon");
      });
    
    new Setting(contentEl)
      .addButton(btn => {
        btn.setButtonText("Close");
        btn.onClick(() => {
          this.close();
        });
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}