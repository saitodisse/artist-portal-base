# Artist Portal Base

Base repository for static achorde artist portals. A portal publishes a human-readable site and an importable read-only source catalog under `/source-catalog/`.

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
