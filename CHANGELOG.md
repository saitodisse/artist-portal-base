# Changelog

## 0.1.1 - 2026-08-03

### Fixed

- Local portal development now forces `PUBLIC_BASE_PATH=/`, while production builds can continue using the repository prefix configured for GitHub Pages.

## 0.1.0 - 2026-07-04

### Added

- Initial Astro + React base repository for static achorde artist portals.
- Demo CC0 catalog content and `/source-catalog/` generation for artists, musical works, playable versions, and chord charts.
- Catalog validation for frontmatter, duplicate IDs, broken minimum references, forbidden sensitive keys, and parser errors.
- GitHub Pages workflow and documented creation flows with and without GitHub CLI.
