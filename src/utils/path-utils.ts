import * as path from "path";
import * as os from "os";

export interface ValidationResult {
  valid: boolean;
  resolvedPath: string;
  error?: string;
}

export function isAbsolutePath(pathStr: string): boolean {
  return pathStr.startsWith("/") || pathStr.startsWith("~") || /^[a-zA-Z]:/.test(pathStr);
}

export function validateOutputPath(inputPath: string, vaultPath: string): ValidationResult {
  if (!inputPath || inputPath.trim().length === 0) {
    return { valid: false, resolvedPath: "", error: "Output path cannot be empty" };
  }

  if (inputPath.includes("..")) {
    return { valid: false, resolvedPath: "", error: "Output path cannot contain parent directory references (..)" };
  }

  let resolvedPath: string;

  if (isAbsolutePath(inputPath)) {
    resolvedPath = inputPath.replace("~", os.homedir());
  } else {
    resolvedPath = path.join(vaultPath, inputPath);
  }

  return { valid: true, resolvedPath };
}

export function encodeUrlPath(pathStr: string): string {
  return pathStr.split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

export function pathToUrl(filePath: string): string {
  let url = filePath.replace(/\.md$/i, "");
  url = url.replace(/\s+/g, "-");
  url = url.toLowerCase();
  url = encodeUrlPath(url);
  return url;
}

export function getOutputPath(relativePath: string): string {
  return `${relativePath}.html`;
}

export function expandHomePath(pathStr: string): string {
  return pathStr.replace("~", os.homedir());
}

export function resolveOutputPath(inputPath: string, vaultRoot: string): string {
  const expandedPath = expandHomePath(inputPath);
  
  if (isAbsolutePath(expandedPath)) {
    return expandedPath;
  }
  
  return path.join(vaultRoot, expandedPath);
}

export function getRelativeOutputPath(inputPath: string, vaultRoot: string): string {
  if (isAbsolutePath(inputPath)) {
    const expandedPath = expandHomePath(inputPath);

    if (expandedPath.startsWith(vaultRoot)) {
      const relative = expandedPath.substring(vaultRoot.length);
      return relative;
    }

    return expandedPath;
  }

  return inputPath;
}
