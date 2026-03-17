import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");

const REQUIRED_FIELDS = [
  "id",
  "name",
  "version",
  "minAppVersion",
  "description",
  "author",
];

const FORBIDDEN_FIELDS = ["overrides"];

const VALID_ID_PATTERN = /^[a-z0-9-]+$/;

function validateManifest() {
  const manifestPath = path.join(ROOT_DIR, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error("❌ manifest.json not found");
    process.exit(1);
  }

  let manifest;
  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(content);
  } catch (error) {
    console.error("❌ Failed to parse manifest.json:", error.message);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in manifest) || manifest[field] === "") {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in manifest) {
      errors.push(`Forbidden field found: "${field}"`);
    }
  }

  if (manifest.id !== undefined) {
    if (!VALID_ID_PATTERN.test(manifest.id)) {
      errors.push(
        `Invalid plugin ID "${manifest.id}". Must be lowercase alphanumeric with hyphens only.`
      );
    }
  }

  if (manifest.authorUrl !== undefined) {
    if (
      typeof manifest.authorUrl === "string" &&
      manifest.authorUrl.includes("github.com")
    ) {
      warnings.push(
        'authorUrl should not point to GitHub repository. Use your personal website or profile page instead.'
      );
    }
  }

  if (manifest.description !== undefined) {
    const desc = manifest.description.toLowerCase();
    if (desc.includes("obsidian")) {
      warnings.push(
        'Description should not include "Obsidian". The plugin is already in the Obsidian ecosystem.'
      );
    }
  }

  if (manifest.isDesktopOnly !== undefined) {
    if (typeof manifest.isDesktopOnly !== "boolean") {
      errors.push('"isDesktopOnly" must be a boolean');
    }
  }

  if (manifest.version !== undefined) {
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push(
        `Invalid version format "${manifest.version}". Must be semver (e.g., 1.0.0)`
      );
    }
  }

  if (manifest.minAppVersion !== undefined) {
    if (!/^\d+\.\d+\.\d+$/.test(manifest.minAppVersion)) {
      errors.push(
        `Invalid minAppVersion format "${manifest.minAppVersion}". Must be semver (e.g., 1.5.0)`
      );
    }
  }

  let hasErrors = false;

  if (errors.length > 0) {
    console.error("❌ Manifest validation errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    hasErrors = true;
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Manifest validation warnings:");
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (!hasErrors && warnings.length === 0) {
    console.log("✅ manifest.json is valid");
  }

  if (hasErrors) {
    process.exit(1);
  }
}

validateManifest();
