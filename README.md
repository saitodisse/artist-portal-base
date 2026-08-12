# Artist Portal Base

Artist Portal Base is a static website template for one artist. It publishes a readable chord-chart portal and a read-only catalog for compatible apps.

Demo: <https://saitodisse.github.io/artist-portal-base/>

## What version 0.3.1 includes

- A chart reader with search, transposition, and font-size controls.
- A separate `/edit/` route.
- URL state for the selected chart, search, transposition, font size, reading version, and new-song flow.
- Browser-only drafts saved after 500 ms.
- A switch between a local draft and the published original.
- A read-only Source Catalog under `/source-catalog/`.

The portal has no account, server storage, sync, or automatic publication. Think of it as a published songbook with a private pencil layer in the browser.

| Path | Purpose |
| --- | --- |
| `/` | Read published charts and local drafts |
| `/edit/` | Edit a chart or create a local song |
| `/help/` | Read the maintainer help page |
| `/source-catalog/` | Import the read-only catalog |

## Run and customize

```bash
pnpm install
pnpm dev
```

Open <http://127.0.0.1:5287/>. A real portal normally changes only:

- `portal.config.ts` for identity, URLs, and theme tokens;
- `catalog/artist.md` for the artist;
- `catalog/charts/<song>/<version>.md` for published charts.

Initialize those files with:

```bash
pnpm portal:init --source-id my-artist --name "My Artist"
```

Keep this repository as `upstream` if the portal should receive base updates:

```bash
git remote rename origin upstream
git remote add origin https://github.com/my-org/my-artist-portal.git
git fetch upstream
git merge upstream/main
```

`pnpm portal:create-github` supports the GitHub CLI flow. Review its arguments first because it creates an external repository.

## Local drafts

The reader and editor keep their state in the URL. Changed charts and new local songs are saved in `localStorage` after 500 ms. If storage is blocked, editing still works for the current session, but the draft may be lost when the page closes.

`Save draft` returns from `/edit/` to the reader with the local version selected. The reader can then switch between the draft and the published original.

Advanced copy and download actions are legacy handoff tools. They produce Markdown or the existing JSON proposal shape for manual review. They do **not** create a Contribution Protocol v2 bundle, contact a Contribution Gateway, open a branch, or create a pull request.

## Source Catalog

`pnpm build:catalog` writes `source-manifest.json`, `checksums.json`, and `entities/*.ndjson` to `public/source-catalog/`.

The portal still publishes schema `1.0.0` with `artist`, `musicalWork`, `playableVersion`, and `chordChart` records. The `@achorde/source-catalog@0.3.0` dependency validates this contract but does not upgrade the output to schema 1.2.

Generation is not byte-deterministic yet. The build clock becomes `generatedAt` and the manifest version, so two builds of unchanged content can differ.

## Validate and deploy

```bash
pnpm validate
pnpm test
pnpm typecheck
pnpm build
```

The included workflow deploys to GitHub Pages. `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH` support a repository path or custom domain. Publishing catalog changes still requires a maintainer to review and commit the files.

## Licenses

The code uses the [MIT License](LICENSE). The fictional demo catalog uses [CC0-1.0](CONTENT-LICENSE.md). See [CHANGELOG.md](CHANGELOG.md) for release history.
