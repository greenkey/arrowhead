export default interface ArrowheadSettings {
  outputDirectory: string;
  templateName: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  includeAttachments: boolean;
  generateIndex: boolean;
  generateSitemap: boolean;
  generateRobotsTxt: boolean;
  processWikilinks: boolean;
  processEmbeds: boolean;
  customCssPath: string;
  customJsPath: string;
  ignoredFolders: string[];
  fileExtension: string;
  prettyUrls: boolean;
}

export const DEFAULT_SETTINGS: ArrowheadSettings = {
  outputDirectory: "site-output",
  templateName: "default",
  siteTitle: "My Obsidian Site",
  siteDescription: "A static website generated from my Obsidian vault",
  siteUrl: "https://example.com",
  includeAttachments: true,
  generateIndex: true,
  generateSitemap: true,
  generateRobotsTxt: true,
  processWikilinks: true,
  processEmbeds: true,
  customCssPath: "",
  customJsPath: "",
  ignoredFolders: [],
  fileExtension: ".html",
  prettyUrls: true
};