import * as os from "os";

export interface ArrowheadSettings {
  outputDirectory: string;
  templateName: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  includeAttachments: boolean;
  generateSitemap: boolean;
  generateRobotsTxt: boolean;
  processWikilinks: boolean;
  processEmbeds: boolean;
  customCssPath: string;
  customJsPath: string;
  ignoredFolders: string[];
  previewServerPort: number;
  autoRegenerate: boolean;
  postsFolder: string;
  pagesFolder: string;
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("~") || /^[a-zA-Z]:/.test(path);
}

export function validateOutputPath(path: string, vaultPath: string): { valid: boolean; resolvedPath: string; error?: string } {
  if (!path || path.trim().length === 0) {
    return { valid: false, resolvedPath: "", error: "Output path cannot be empty" };
  }

  let resolvedPath: string;

  if (isAbsolutePath(path)) {
    resolvedPath = path.replace("~", process.env.HOME || "");
  } else {
    resolvedPath = `${vaultPath}/${path}`;
  }

  if (resolvedPath.includes("..")) {
    return { valid: false, resolvedPath, error: "Output path cannot contain parent directory references (..)" };
  }

  return { valid: true, resolvedPath };
}

export const DEFAULT_SETTINGS: ArrowheadSettings = {
  outputDirectory: `${os.tmpdir()}/arrowhead-output`,
  templateName: "default",
  siteTitle: "My Obsidian Site",
  siteDescription: "A static website generated from my Obsidian vault",
  siteUrl: "https://example.com",
  includeAttachments: true,
  generateSitemap: true,
  generateRobotsTxt: true,
  processWikilinks: true,
  processEmbeds: true,
  customCssPath: "",
  customJsPath: "",
  ignoredFolders: [],
  previewServerPort: 3456,
  autoRegenerate: true,
  postsFolder: "posts",
  pagesFolder: "pages"
};