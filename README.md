# Artist Portal Base

Base repository for static achorde artist portals. A portal publishes a human-readable site and an importable read-only source catalog under `/source-catalog/`.

Published demo: <https://saitodisse.github.io/artist-portal-base/>

## ACHORDE Docs Hub

Use the ACHORDE Docs Hub to understand how artist portals, source catalogs, and the rendering packages fit into the broader ecosystem:

- English: <https://achorde-musical-domain.vercel.app/en>
- Portuguese: <https://achorde-musical-domain.vercel.app/pt-br>
- Local dev server: <http://127.0.0.1:5286/>

Relevant public packages for this base:

- `@achorde/source-catalog` validates the static catalog contract.
- `@achorde/tab-renderer` parses and renders published chord charts.
- `@achorde/tab-editor` is the reusable editor for local drafts, diagnostics,
  preview, Markdown export, and copyable change proposals.

The base is meant to remain updateable. Create each real portal as a new repository with an `upstream` remote pointing back to this base, then pull base improvements with:

```bash
git fetch upstream
git merge upstream/main
```

## Repository Contract

Customize these areas in real portals:

- `portal.config.ts`
- `catalog/`
- small theme tokens in `portal.config.ts`

Treat the rest of the codebase as updateable base code.

## Catalog Shape

- `catalog/artist.md` describes the artist, band, project, or community.
- `catalog/charts/<song>/<version>.md` stores YAML frontmatter plus the raw chord chart body.
- `public/source-catalog/` is generated and contains `source-manifest.json`, `checksums.json`, and `entities/*.ndjson`.

The generated v1 catalog includes:

- `artist`
- `musicalWork`
- `playableVersion`
- `chordChart`

`voicing` and `chordAlias` are optional future extensions.

## Editing Model

This base stays static. People can find a song, edit the chord chart, and save a
local draft without an account or Git knowledge. A local save is never a
publication: the portal labels it as saved on this device until it is submitted.
For a published song, the original remains available through `Ver versão original`;
the saved local version is the default again when the page is reopened.

The portable contribution package remains available for every Git host. A portal
may optionally configure an external, self-hostable Contribution Gateway to
assist a GitHub or GitLab contributor with creating a fork, branch, and review
proposal. The gateway is not required for reading, editing, saving, or exporting
a contribution, and the static source catalog remains pull-only.

The reusable editor surface is `@achorde/tab-editor`; persistence, authored
metadata, Git, and forge integrations belong to the portal or the optional
gateway, not the editor package.

## Scripts

```bash
pnpm validate
pnpm build:catalog
pnpm build
pnpm test
pnpm portal:init --source-id my-artist --name "My Artist"
```

## Create a Portal With `gh`

```bash
git clone https://github.com/saitodisse/artist-portal-base.git my-artist-portal
cd my-artist-portal
git remote rename origin upstream
pnpm portal:init --source-id my-artist --name "My Artist" --site-url https://my-org.github.io --repository-url https://github.com/my-org/my-artist-portal
gh repo create my-org/my-artist-portal --public --source . --remote origin --push
```

## Create a Portal Without `gh`

1. Create an empty public repository on GitHub.
2. Clone this base locally and rename `origin` to `upstream`.
3. Add the new repository as `origin`.
4. Push `main`.

```bash
git clone https://github.com/saitodisse/artist-portal-base.git my-artist-portal
cd my-artist-portal
git remote rename origin upstream
git remote add origin https://github.com/my-org/my-artist-portal.git
pnpm portal:init --source-id my-artist --name "My Artist" --site-url https://my-org.github.io --repository-url https://github.com/my-org/my-artist-portal
git push -u origin main
```

## GitHub Pages

The included workflow builds and deploys with GitHub Pages. `astro.config.mjs` reads:

- `PUBLIC_SITE_URL`
- `PUBLIC_BASE_PATH`

This supports both `/<repo>` hosting and custom domains.

## Licenses

Code is MIT. Initial demo content in `catalog/` is CC0-1.0 and fictional.
