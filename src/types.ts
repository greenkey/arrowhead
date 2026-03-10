export interface ExportOptions {
  outputDirectory: string;
  template: string;
  prettyUrls: boolean;
  includeAssets: boolean;
  generateIndex: boolean;
  sitemap: boolean;
  robots: boolean;
  wikilinks: boolean;
  embeds: boolean;
}

export interface GenerationResult {
  success: boolean;
  pagesGenerated: number;
  assetsCopied: number;
  errors: string[];
  warnings: string[];
  outputPath: string;
  duration: number;
}

export interface SiteConfig {
  title: string;
  description: string;
  url: string;
  author?: string;
  language?: string;
  favicon?: string;
}

export interface PageData {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  categories: string[];
  date?: string;
  lastModified: string;
  url: string;
}