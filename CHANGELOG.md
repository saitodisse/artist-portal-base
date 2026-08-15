# Changelog

## 0.3.2 - 2026-08-15

### Changed

- Atualizado o Source Catalog para o schema 1.3, com licença editorial fixa, operador e canal de notificação.
- Mantidos metadados independentes de obras quando a última cifra é retirada do deploy.

## 0.3.1 - 2026-08-12

### Documentation

- Clarified the current 0.3 reading, editing, URL-state, and local-draft behavior.
- Marked Markdown and JSON handoff as legacy tools, not Protocol v3 or Gateway submission.
- Documented schema 1.3, the fixed `CC-BY-NC-SA-4.0` license, operator notice channel, and source takedown semantics.
- Added independent `catalog/works/` metadata so removing a chart does not remove the musical work from the importable catalog.

## 0.3.0 - 2026-08-11

### Added

- Typed reading and editing state in the URL, with a separate `/edit/` route and a return to the reader.
- An explicit choice between local, published, and original reading versions.

### Changed

- Local saves remain on the current device and preserve the reader URL.

## 0.2.0 - 2026-08-08

### Added

- A guided, Git-free song flow: find songs, edit chord charts, create local songs, and retain drafts on the current device.
- Local reading keeps a saved draft as the default and lets people compare it with the published original.
- Catalog import now provides a copy action with clear AC15 instructions.

### Changed

- The primary portal path uses plain-language labels and moves catalog and proposal mechanics into advanced options.
- Updated the catalog contract dependency to `@achorde/source-catalog@^0.2.0`.

## 0.1.1 - 2026-08-03

### Fixed

- Local portal development now forces `PUBLIC_BASE_PATH=/`, while production builds can continue using the repository prefix configured for GitHub Pages.

## 0.1.0 - 2026-07-04

### Added

- Initial Astro + React base repository for static achorde artist portals.
- Demo `CC-BY-NC-SA-4.0` catalog content and `/source-catalog/` generation for artists, musical works, playable versions, and chord charts.
- Catalog validation for frontmatter, duplicate IDs, broken minimum references, forbidden sensitive keys, and parser errors.
- GitHub Pages workflow and documented creation flows with and without GitHub CLI.
