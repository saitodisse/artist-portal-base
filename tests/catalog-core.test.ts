import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalogOutput, loadCatalogDraft, validateCatalogDraft } from "../scripts/catalog-core";

describe("artist portal source catalog", () => {
  it("generates the expected manifest, checksums, and NDJSON files from the demo fixture", async () => {
    const output = await buildCatalogOutput();

    expect(output.manifest.id).toBe("demo-artist-portal");
    expect(output.manifest.files.map((file) => file.url)).toEqual([
      "entities/artists.ndjson",
      "entities/musical-works.ndjson",
      "entities/playable-versions.ndjson",
      "entities/chord-charts.ndjson",
    ]);
    expect(Object.keys(output.checksums)).toEqual([
      "entities/artists.ndjson",
      "entities/chord-charts.ndjson",
      "entities/musical-works.ndjson",
      "entities/playable-versions.ndjson",
    ]);
    expect(output.files.find((file) => file.url === "entities/chord-charts.ndjson")?.content).toContain(
      "\"rawText\":\"[Intro]",
    );
  });

  it("fails validation for duplicate IDs and empty charts", async () => {
    const draft = await loadCatalogDraft();
    draft.charts.push({ ...draft.charts[0]!, rawText: "" });

    expect(validateCatalogDraft(draft)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Duplicate ID: playableVersion:linha-aberta-demo"),
        expect.stringContaining("chord chart body must not be empty"),
      ]),
    );
  });

  it("rejects forbidden keys in frontmatter", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "artist-portal-"));
    await mkdir(path.join(dir, "charts", "demo"), { recursive: true });
    await writeFile(
      path.join(dir, "artist.md"),
      `---
id: demo
name: Demo
slug: demo
summary: Demo
email: hidden@example.test
updatedAt: 2026-07-04T12:00:00.000Z
---
Demo
`,
    );

    await expect(loadCatalogDraft(dir)).rejects.toThrow("Forbidden source catalog key: email");
  });
});
