import * as os from "os";
import { isAbsolutePath, validateOutputPath, type ValidationResult } from "../utils/path-utils";

export interface ArrowheadSettings {
  outputDirectory: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  includeAttachments: boolean;
  generateSitemap: boolean;
  generateRobotsTxt: boolean;
  processWikilinks: boolean;
  processEmbeds: boolean;
  ignoredFolders: string[];
  previewServerPort: number;
  autoRegenerate: boolean;
  postsFolder: string;
  pagesFolder: string;
}

export { isAbsolutePath, validateOutputPath };
export type { ValidationResult };

export const DEFAULT_SETTINGS: ArrowheadSettings = {
  outputDirectory: `${os.tmpdir()}/arrowhead-output`,
  siteTitle: "My Obsidian Site",
  siteDescription: "A static website generated from my Obsidian vault",
  siteUrl: "https://example.com",
  includeAttachments: true,
  generateSitemap: true,
  generateRobotsTxt: true,
  processWikilinks: true,
  processEmbeds: true,
  ignoredFolders: [],
  previewServerPort: 3456,
  autoRegenerate: true,
  postsFolder: "posts",
  pagesFolder: "pages"
};