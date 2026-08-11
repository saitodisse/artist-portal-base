# Changelog

## 0.3.0 - 2026-08-11

### Added

- Estado de leitura/edição tipado na URL, com rota `/edit/` e retorno ao leitor.
- Seleção explícita entre leitura local, publicada e original.

### Changed

- O salvamento local continua limitado ao dispositivo e preserva a URL de leitura.

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
- Demo CC0 catalog content and `/source-catalog/` generation for artists, musical works, playable versions, and chord charts.
- Catalog validation for frontmatter, duplicate IDs, broken minimum references, forbidden sensitive keys, and parser errors.
- GitHub Pages workflow and documented creation flows with and without GitHub CLI.
