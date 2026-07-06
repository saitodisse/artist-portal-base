import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  assertNoForbiddenSourceCatalogKeys,
  assertSourceCatalogEnvelope,
  assertSourceCatalogManifest,
  createChecksum,
  createIsoDateTime,
  createSourceCatalogChecksums,
  type Checksum,
  type SourceCatalogEnvelope,
  type SourceCatalogEntityType,
  type SourceCatalogFile,
  type SourceCatalogManifest,
} from "@achorde/source-catalog";
import { parseTab } from "@achorde/tab-renderer";
import portal from "../portal.config";

export type ArtistDraft = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  location?: string;
  links?: Array<{ label: string; url: string }>;
  updatedAt: string;
  body: string;
};

export type ChartDraft = {
  id: string;
  updatedAt: string;
  work: {
    id: string;
    title: string;
    slug: string;
  };
  version: {
    title: string;
    slug: string;
    kind: string;
    sourceKey: string;
    instrumentId: string;
    tuningId: string;
  };
  editorial?: Record<string, unknown>;
  rawText: string;
  originalMarkdown: string;
  sourcePath: string;
  filePath: string;
};

export type CatalogDraft = {
  artist: ArtistDraft;
  charts: ChartDraft[];
};

export type CatalogBuildOutput = {
  manifest: SourceCatalogManifest;
  checksums: Record<string, Checksum>;
  files: Array<{ url: string; content: string }>;
  envelopes: SourceCatalogEnvelope[];
};

const repoRoot = process.cwd();
const catalogDir = path.join(repoRoot, "catalog");
const outputDir = path.join(repoRoot, "public", "source-catalog");

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function parseMarkdownWithFrontmatter(content: string, filePath: string) {
  if (!content.startsWith("---\n")) {
    throw new Error(`${filePath} must start with YAML frontmatter.`);
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error(`${filePath} is missing the closing frontmatter marker.`);
  }

  const yaml = content.slice(4, closingIndex);
  const body = content.slice(closingIndex + 4).replace(/^\r?\n/, "");
  const frontmatter = requireObject(parseYaml(yaml), `${filePath} frontmatter`);

  assertNoForbiddenSourceCatalogKeys(frontmatter);

  return { frontmatter, body };
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function loadCatalogDraft(baseDir = catalogDir): Promise<CatalogDraft> {
  const artistPath = path.join(baseDir, "artist.md");
  const artistContent = await readFile(artistPath, "utf8");
  const parsedArtist = parseMarkdownWithFrontmatter(artistContent, artistPath);
  const artistFrontmatter = parsedArtist.frontmatter;
  const chartsDir = path.join(baseDir, "charts");
  const chartFiles = (await stat(chartsDir).then((value) => value.isDirectory()).catch(() => false))
    ? await listMarkdownFiles(chartsDir)
    : [];

  const artist: ArtistDraft = {
    id: requireString(artistFrontmatter.id, "artist.id"),
    name: requireString(artistFrontmatter.name, "artist.name"),
    slug: requireString(artistFrontmatter.slug, "artist.slug"),
    summary: requireString(artistFrontmatter.summary, "artist.summary"),
    location:
      typeof artistFrontmatter.location === "string"
        ? artistFrontmatter.location
        : undefined,
    links: Array.isArray(artistFrontmatter.links)
      ? artistFrontmatter.links.map((link, index) => {
          const item = requireObject(link, `artist.links[${index}]`);
          return {
            label: requireString(item.label, `artist.links[${index}].label`),
            url: requireString(item.url, `artist.links[${index}].url`),
          };
        })
      : undefined,
    updatedAt: requireString(artistFrontmatter.updatedAt, "artist.updatedAt"),
    body: parsedArtist.body.trim(),
  };

  const charts = await Promise.all(
    chartFiles.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const parsed = parseMarkdownWithFrontmatter(content, filePath);
      const frontmatter = parsed.frontmatter;
      const work = requireObject(frontmatter.work, `${filePath} work`);
      const version = requireObject(frontmatter.version, `${filePath} version`);

      return {
        id: requireString(frontmatter.id, `${filePath} id`),
        updatedAt: requireString(frontmatter.updatedAt, `${filePath} updatedAt`),
        work: {
          id: requireString(work.id, `${filePath} work.id`),
          title: requireString(work.title, `${filePath} work.title`),
          slug: requireString(work.slug, `${filePath} work.slug`),
        },
        version: {
          title: requireString(version.title, `${filePath} version.title`),
          slug: requireString(version.slug, `${filePath} version.slug`),
          kind: requireString(version.kind, `${filePath} version.kind`),
          sourceKey: requireString(version.sourceKey, `${filePath} version.sourceKey`),
          instrumentId: requireString(version.instrumentId, `${filePath} version.instrumentId`),
          tuningId: requireString(version.tuningId, `${filePath} version.tuningId`),
        },
        editorial:
          frontmatter.editorial && typeof frontmatter.editorial === "object" && !Array.isArray(frontmatter.editorial)
            ? (frontmatter.editorial as Record<string, unknown>)
            : undefined,
        rawText: parsed.body.trim(),
        originalMarkdown: content,
        sourcePath: path.relative(repoRoot, filePath).split(path.sep).join("/"),
        filePath,
      } satisfies ChartDraft;
    }),
  );

  return {
    artist,
    charts: charts.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function envelope<TPayload>(
  sourceRecordId: string,
  entityType: SourceCatalogEntityType,
  payload: TPayload,
  updatedAt?: string,
): SourceCatalogEnvelope<TPayload> {
  return assertSourceCatalogEnvelope({
    sourceId: portal.sourceId,
    sourceRecordId,
    entityType,
    schemaVersion: portal.publication.schemaVersion,
    ...(updatedAt ? { updatedAt: createIsoDateTime(updatedAt) } : {}),
    payload,
  });
}

export function validateCatalogDraft(draft: CatalogDraft): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const works = new Set<string>();

  function addId(id: string, label: string) {
    if (ids.has(id)) {
      errors.push(`Duplicate ID: ${id} (${label})`);
    }
    ids.add(id);
  }

  try {
    createIsoDateTime(draft.artist.updatedAt);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  addId(`artist:${draft.artist.id}`, "artist");

  for (const chart of draft.charts) {
    addId(`playableVersion:${chart.id}`, chart.filePath);
    addId(`chordChart:${chart.id}`, chart.filePath);
    if (!works.has(chart.work.id)) {
      works.add(chart.work.id);
      addId(`musicalWork:${chart.work.id}`, chart.filePath);
    }

    if (!chart.rawText.trim()) {
      errors.push(`${chart.filePath} chord chart body must not be empty.`);
    }

    try {
      createIsoDateTime(chart.updatedAt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      const parsed = parseTab(chart.rawText);
      const fatalDiagnostics = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      if (fatalDiagnostics.length > 0) {
        errors.push(`${chart.filePath} has parser errors: ${fatalDiagnostics.map((item) => item.code).join(", ")}`);
      }
    } catch (error) {
      errors.push(`${chart.filePath} could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return errors;
}

function sha256(content: string): Checksum {
  return createChecksum(createHash("sha256").update(content).digest("hex"));
}

function toNdjson(envelopes: SourceCatalogEnvelope[]): string {
  return `${envelopes.map((item) => JSON.stringify(item)).join("\n")}\n`;
}

function createFile(url: string, envelopes: SourceCatalogEnvelope[]) {
  return {
    url,
    content: toNdjson(envelopes.sort((a, b) => a.sourceRecordId.localeCompare(b.sourceRecordId))),
  };
}

export async function buildCatalogOutput(draft?: CatalogDraft): Promise<CatalogBuildOutput> {
  draft ??= await loadCatalogDraft();
  const validationErrors = validateCatalogDraft(draft);
  if (validationErrors.length > 0) {
    throw new Error(`Catalog validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`);
  }

  const artistEnvelope = envelope(
    draft.artist.id,
    "artist",
    {
      name: draft.artist.name,
      slug: draft.artist.slug,
      summary: draft.artist.summary,
      location: draft.artist.location,
      links: draft.artist.links ?? [],
      body: draft.artist.body,
    },
    draft.artist.updatedAt,
  );

  const workById = new Map<string, SourceCatalogEnvelope>();
  const playableVersions: SourceCatalogEnvelope[] = [];
  const chordCharts: SourceCatalogEnvelope[] = [];

  for (const chart of draft.charts) {
    if (!workById.has(chart.work.id)) {
      workById.set(
        chart.work.id,
        envelope(
          chart.work.id,
          "musicalWork",
          {
            title: chart.work.title,
            slug: chart.work.slug,
            artistSlug: draft.artist.slug,
            identityKey: chart.work.id,
          },
          chart.updatedAt,
        ),
      );
    }

    playableVersions.push(
      envelope(
        chart.id,
        "playableVersion",
        {
          title: chart.version.title,
          slug: chart.version.slug,
          kind: chart.version.kind,
          artistSlug: draft.artist.slug,
          musicalWorkKey: chart.work.id,
          sourceKey: chart.version.sourceKey,
          instrumentId: chart.version.instrumentId,
          tuningId: chart.version.tuningId,
          editorial: chart.editorial ?? {},
        },
        chart.updatedAt,
      ),
    );

    chordCharts.push(
      envelope(
        chart.id,
        "chordChart",
        {
          playableVersionSourceRecordId: chart.id,
          rawText: chart.rawText,
        },
        chart.updatedAt,
      ),
    );
  }

  const files = [
    createFile("entities/artists.ndjson", [artistEnvelope]),
    createFile("entities/musical-works.ndjson", [...workById.values()]),
    createFile("entities/playable-versions.ndjson", playableVersions),
    createFile("entities/chord-charts.ndjson", chordCharts),
  ];

  const filesWithChecksums = files.map((file) => ({
    ...file,
    sha256: sha256(file.content),
    sizeBytes: Buffer.byteLength(file.content, "utf8"),
  }));
  const checksums = createSourceCatalogChecksums(filesWithChecksums);
  const generatedAt = createIsoDateTime(new Date().toISOString());
  const manifestFiles: SourceCatalogFile[] = filesWithChecksums.map((file) => ({
    url: file.url,
    entityType:
      file.url === "entities/artists.ndjson"
        ? "artist"
        : file.url === "entities/musical-works.ndjson"
          ? "musicalWork"
          : file.url === "entities/playable-versions.ndjson"
            ? "playableVersion"
            : "chordChart",
    mediaType: "application/x-ndjson",
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    updatedAt: generatedAt,
  }));

  const manifest = assertSourceCatalogManifest({
    id: portal.sourceId,
    name: portal.publicName,
    version: generatedAt,
    schemaVersion: portal.publication.schemaVersion,
    mode: "readonly",
    generatedAt,
    files: manifestFiles,
    capabilities: {
      pull: true,
      push: false,
      batchPush: false,
      realtime: false,
      proposals: false,
      revisions: false,
      moderation: false,
      conflictResolution: "manual",
      auth: "none",
    },
  });

  return {
    manifest,
    checksums,
    files,
    envelopes: [
      artistEnvelope,
      ...workById.values(),
      ...playableVersions,
      ...chordCharts,
    ],
  };
}

export async function writeCatalogOutput(output?: CatalogBuildOutput): Promise<void> {
  output ??= await buildCatalogOutput();
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, "entities"), { recursive: true });

  for (const file of output.files) {
    await writeFile(path.join(outputDir, file.url), file.content);
  }

  await writeFile(path.join(outputDir, "checksums.json"), `${JSON.stringify(output.checksums, null, 2)}\n`);
  await writeFile(path.join(outputDir, "source-manifest.json"), `${JSON.stringify(output.manifest, null, 2)}\n`);
}
