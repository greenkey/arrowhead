import { App, PluginSettingTab, Setting, TextComponent, DropdownComponent, ToggleComponent, DirectoryPickerComponent, ButtonComponent } from "obsidian";
import ArrowheadPlugin from "../main";
import { DEFAULT_SETTINGS } from "./settings";

export class ArrowheadSettingTab extends PluginSettingTab {
  plugin: ArrowheadPlugin;

  constructor(app: App, plugin: ArrowheadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.createSiteSettings(containerEl);
    this.createOutputSettings(containerEl);
    this.createTemplateSettings(containerEl);
    this.createGenerationSettings(containerEl);
    this.createAdvancedSettings(containerEl);
  }

  private createSiteSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Site Information" });
    containerEl.createEl("p", { 
      text: "Basic information about your static site", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Site Title")
      .setDesc("The title displayed in the site header and browser title bar")
      .addText(text => this.createTextSetting(text, "siteTitle"));

    new Setting(containerEl)
      .setName("Site Description")
      .setDesc("A brief description of your site, used in meta tags")
      .addText(text => this.createTextSetting(text, "siteDescription"));

    new Setting(containerEl)
      .setName("Site URL")
      .setDesc("The full URL where your site will be hosted (used for canonical URLs)")
      .addText(text => this.createTextSetting(text, "siteUrl"));
  }

  private createOutputSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Output Settings" });
    containerEl.createEl("p", { 
      text: "Configure where and how your site is generated", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Output Directory")
      .setDesc("Directory relative to vault root where files will be generated")
      .addText(text => this.createTextSetting(text, "outputDirectory"));

    new Setting(containerEl)
      .setName("File Extension")
      .setDesc("Extension for generated HTML files")
      .addDropdown(dropdown => {
        dropdown.addOption(".html", ".html");
        dropdown.addOption(".htm", ".htm");
        dropdown.setValue(this.plugin.settings.fileExtension);
        dropdown.onChange(async (value) => {
          this.plugin.settings.fileExtension = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Pretty URLs")
      .setDesc("Generate clean URLs like /page/ instead of /page.html")
      .addToggle(toggle => this.createToggleSetting(toggle, "prettyUrls"));
  }

  private createTemplateSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Template Settings" });
    containerEl.createEl("p", { 
      text: "Customize the appearance of your generated site", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Template")
      .setDesc("Choose a template theme for your site")
      .addDropdown(dropdown => {
        dropdown.addOption("default", "Default Theme");
        dropdown.addOption("minimal", "Minimal Theme");
        dropdown.addOption("notebook", "Notebook Theme");
        dropdown.addOption("custom", "Custom Template");
        dropdown.setValue(this.plugin.settings.templateName);
        dropdown.onChange(async (value) => {
          this.plugin.settings.templateName = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Custom CSS")
      .setDesc("Path to custom CSS file (relative to vault root)")
      .addText(text => this.createTextSetting(text, "customCssPath"));

    new Setting(containerEl)
      .setName("Custom JavaScript")
      .setDesc("Path to custom JavaScript file (relative to vault root)")
      .addText(text => this.createTextSetting(text, "customJsPath"));
  }

  private createGenerationSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Generation Options" });
    containerEl.createEl("p", { 
      text: "Configure what content and features are included", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Include Attachments")
      .setDesc("Copy images and other attachments to the output directory")
      .addToggle(toggle => this.createToggleSetting(toggle, "includeAttachments"));

    new Setting(containerEl)
      .setName("Generate Index")
      .setDesc("Create a site index page with all notes")
      .addToggle(toggle => this.createToggleSetting(toggle, "generateIndex"));

    new Setting(containerEl)
      .setName("Generate Sitemap")
      .setDesc("Create sitemap.xml for search engines")
      .addToggle(toggle => this.createToggleSetting(toggle, "generateSitemap"));

    new Setting(containerEl)
      .setName("Generate Robots.txt")
      .setDesc("Create robots.txt for search engine crawling")
      .addToggle(toggle => this.createToggleSetting(toggle, "generateRobotsTxt"));

    new Setting(containerEl)
      .setName("Process Wiki Links")
      .setDesc("Convert [[Wiki Links]] to HTML links")
      .addToggle(toggle => this.createToggleSetting(toggle, "processWikilinks"));

    new Setting(containerEl)
      .setName("Process Embeds")
      .setDesc("Handle [[Image]] and other embeds")
      .addToggle(toggle => this.createToggleSetting(toggle, "processEmbeds"));
  }

  private createAdvancedSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Advanced Settings" });
    containerEl.createEl("p", { 
      text: "Fine-tune the generation process", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Ignored Folders")
      .setDesc("Comma-separated list of folders to exclude (e.g., _templates, .obsidian)")
      .addText(text => {
        text.setPlaceholder("folder1, folder2, folder3");
        text.setValue(this.plugin.settings.ignoredFolders.join(", "));
        text.onChange(async (value) => {
          this.plugin.settings.ignoredFolders = value.split(",").map(s => s.trim()).filter(s => s);
          await this.plugin.saveSettings();
        });
      });
  }

  private createTextSetting(text: TextComponent, settingKey: keyof typeof DEFAULT_SETTINGS): void {
    text.setPlaceholder(DEFAULT_SETTINGS[settingKey] as string);
    text.setValue(this.plugin.settings[settingKey] as string);
    text.onChange(async (value) => {
      this.plugin.settings[settingKey] = value;
      await this.plugin.saveSettings();
    });
  }

  private createToggleSetting(toggle: ToggleComponent, settingKey: keyof typeof DEFAULT_SETTINGS): void {
    toggle.setValue(this.plugin.settings[settingKey] as boolean);
    toggle.onChange(async (value) => {
      this.plugin.settings[settingKey] = value;
      await this.plugin.saveSettings();
    });
  }
}