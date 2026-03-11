import { App, PluginSettingTab, Setting, TextComponent, DropdownComponent, ToggleComponent, ButtonComponent } from "obsidian";
import ArrowheadPlugin from "../main";
import { DEFAULT_SETTINGS, ArrowheadSettings, isAbsolutePath, validateOutputPath } from "./settings";

export class ArrowheadSettingTab extends PluginSettingTab {
  plugin: ArrowheadPlugin;

  constructor(app: App, plugin: ArrowheadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const manifest = this.plugin.manifest || { version: "unknown" };
    containerEl.createEl("div", {
      text: `Arrowhead Static Site Generator v${manifest.version}`,
      cls: "arrowhead-version"
    });

    this.createSiteSettings(containerEl);
    this.createOutputSettings(containerEl);
    this.createTemplateSettings(containerEl);
    this.createGenerationSettings(containerEl);
    this.createPreviewSettings(containerEl);
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

    let resolvedPathDisplay: HTMLElement;

    const vaultPath = this.plugin.getVaultRootPath();

    let outputTextComponent: TextComponent | null = null;

    new Setting(containerEl)
      .setName("Output Directory")
      .setDesc("Directory where generated files will be placed (absolute or relative to vault root)")
      .addText(text => {
        outputTextComponent = text;
        text.setPlaceholder("public");
        text.setValue(this.plugin.settings.outputDirectory);
        text.onChange(async (value) => {
          this.plugin.settings.outputDirectory = value.trim();
          await this.plugin.saveSettings();
          this.updateResolvedPathDisplay(text.getValue(), resolvedPathDisplay);
        });
      })
      .addButton(button => {
        button.setIcon("folder");
        button.setTooltip("Choose folder");
        button.onClick(async () => {
          const filePicker = (this.app as unknown as { filePicker: { open(options: unknown): Promise<string[]> } }).filePicker;
          const result = await filePicker.open({
            defaultPath: this.plugin.settings.outputDirectory || "",
            startPath: this.plugin.settings.outputDirectory || "",
            submitButtonLabel: "Select",
            multi: false,
            fileOrFolders: "folders"
          });
          const selectedPath = result[0];
          if (result && result.length > 0 && selectedPath && outputTextComponent) {
            const settings = this.plugin.settings;
            let pathToUse = selectedPath;
            if (pathToUse.startsWith(vaultPath)) {
              pathToUse = pathToUse.substring(vaultPath.length + 1);
            }
            outputTextComponent.setValue(pathToUse);
            settings.outputDirectory = pathToUse.trim();
            await this.plugin.saveSettings();
            this.updateResolvedPathDisplay(pathToUse, resolvedPathDisplay);
          }
        });
      });

    resolvedPathDisplay = containerEl.createEl("div", { cls: "resolved-path-display" });
    this.updateResolvedPathDisplay(this.plugin.settings.outputDirectory, resolvedPathDisplay);
  }

  private createTemplateSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Template Settings" });
    containerEl.createEl("p", { 
      text: "Customize the appearance of your generated site", 
      cls: "setting-description" 
    });

    containerEl.createEl("div", {
      text: "⚠️ Beta: Template system is under active development",
      cls: "arrowhead-beta-warning"
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

  private createPreviewSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Preview Settings" });
    containerEl.createEl("p", { 
      text: "Configure the in-app preview functionality", 
      cls: "setting-description" 
    });

    new Setting(containerEl)
      .setName("Preview Server Port")
      .setDesc("Port for the local preview server (default: 3456)")
      .addText(text => {
        text.setPlaceholder("3456");
        text.setValue(String(this.plugin.settings.previewServerPort));
        text.onChange(async (value) => {
          const port = parseInt(value, 10);
          if (!isNaN(port) && port > 0 && port < 65536) {
            this.plugin.settings.previewServerPort = port;
            await this.plugin.saveSettings();
          }
        });
      });

    new Setting(containerEl)
      .setName("Auto-regenerate on change")
      .setDesc("Automatically regenerate site when vault files change")
      .addToggle(toggle => this.createToggleSetting(toggle, "autoRegenerate"));
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

  private createTextSetting(text: TextComponent, settingKey: keyof ArrowheadSettings): void {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    text.setPlaceholder(DEFAULT_SETTINGS[settingKey] as string);
    text.setValue(settings[settingKey] as string);
    text.onChange(async (value) => {
      settings[settingKey] = value;
      await this.plugin.saveSettings();
    });
  }

  private createToggleSetting(toggle: ToggleComponent, settingKey: keyof ArrowheadSettings): void {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    toggle.setValue(settings[settingKey] as boolean);
    toggle.onChange(async (value) => {
      settings[settingKey] = value;
      await this.plugin.saveSettings();
    });
  }

  private updateResolvedPathDisplay(inputPath: string, displayEl: HTMLElement): void {
    const adapter = this.plugin.app.vault.adapter;
    const vaultPath = (adapter as unknown as { getBasePath(): string }).getBasePath();
    const validation = validateOutputPath(inputPath, vaultPath);

    displayEl.empty();

    if (inputPath && inputPath.trim().length > 0) {
      const label = displayEl.createEl("span", {
        text: `Resolved path: ${validation.resolvedPath}`,
        cls: "settingResolvedPath"
      });

      if (validation.valid) {
        label.style.color = "var(--text-success)";
      } else {
        label.style.color = "var(--text-error)";
        label.createEl("br");
        label.createEl("span", {
          text: `Error: ${validation.error}`,
          cls: "settingError"
        });
      }
    } else {
      displayEl.createEl("span", {
        text: "Enter an output path above",
        cls: "settingPlaceholder"
      });
    }
  }
}