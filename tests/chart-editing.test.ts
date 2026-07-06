import { describe, expect, it } from "vitest";
import {
  composeChartMarkdown,
  createChartMarkdownProposal,
} from "../src/lib/chart-editing";

const originalMarkdown = `---
id: demo-chart
updatedAt: 2026-07-01T10:00:00.000Z
work:
  id: demo-work
  title: Demo Work
  slug: demo-work
---
[Intro]
C G Am F
`;

describe("chart editing helpers", () => {
  it("recomposes Markdown while preserving frontmatter and updating updatedAt", () => {
    const markdown = composeChartMarkdown({
      sourcePath: "catalog/charts/demo/demo.md",
      originalMarkdown,
      nextRawText: "[Intro]\nDm G C\n",
      updatedAt: "2026-07-06T12:00:00.000Z",
    });

    expect(markdown).toBe(`---
id: demo-chart
updatedAt: 2026-07-06T12:00:00.000Z
work:
  id: demo-work
  title: Demo Work
  slug: demo-work
---
[Intro]
Dm G C
`);
  });

  it("creates a copyable text change proposal for the source file", () => {
    const proposal = createChartMarkdownProposal({
      sourcePath: "catalog/charts/demo/demo.md",
      originalMarkdown,
      nextRawText: "[Intro]\nDm G C\n",
      updatedAt: "2026-07-06T12:00:00.000Z",
    });

    expect(proposal).toMatchObject({
      path: "catalog/charts/demo/demo.md",
      before: originalMarkdown,
      hasChanges: true,
      summary: "Update chord chart at catalog/charts/demo/demo.md.",
    });
    expect(proposal.after).toBe(proposal.updatedMarkdown);
    expect(proposal.after).toContain("updatedAt: 2026-07-06T12:00:00.000Z");
  });

  it("keeps proposals unchanged when the chart body did not change", () => {
    const proposal = createChartMarkdownProposal({
      sourcePath: "catalog/charts/demo/demo.md",
      originalMarkdown,
      nextRawText: "[Intro]\nC G Am F\n",
      updatedAt: "2026-07-06T12:00:00.000Z",
    });

    expect(proposal.hasChanges).toBe(false);
    expect(proposal.after).toBe(originalMarkdown);
  });
});
