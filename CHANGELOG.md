# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://keepachangelog.com/en/2.0.0/).

## [1.0.11]

### Fixes
- Update plugin ID to `arrowhead` (was `arrowhead-obsidian-plugin`)
- Fix authorUrl to point to personal site instead of GitHub repo
- Remove invalid `overrides` property from manifest
- Track build output files (main.js, styles.css) in git for releases

### Other
- Add Obsidian to plugin description for clarity

## [1.0.6]

### Features
- Implement automated release workflow with Codeberg-GitHub mirroring
- Add release preparation scripts (release-prepare, release-commit)
- Add GitHub Actions release workflow for automatic releases
- Move CONTRIBUTING.md to root with release process documentation

### Fixes
- Add git authentication for tag creation in CI/CD

### Other
- Move tag creation to GitHub workflow (refactor)

## [1.0.5] - 2026-03-13

### Features
- 1721c5d feat: implement automated release workflow with Codeberg-GitHub mirroring

## [1.0.4] - 2025-02-28

### Added
- Initial plugin release
- Static site generation from Obsidian vault
- Markdown processing with full formatting support
- Customizable themes and export options