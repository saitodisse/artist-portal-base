import { createTextChangeProposal, type TextChangeProposal } from "@achorde/tab-editor";

export type ChartMarkdownUpdateInput = {
  sourcePath: string;
  originalMarkdown: string;
  nextRawText: string;
  updatedAt?: string;
};

export type ChartMarkdownProposal = TextChangeProposal & {
  updatedMarkdown: string;
};

function splitFrontmatter(markdown: string) {
  if (!markdown.startsWith("---\n")) {
    throw new Error("Chart Markdown must start with YAML frontmatter.");
  }

  const closingIndex = markdown.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("Chart Markdown is missing the closing frontmatter marker.");
  }

  return {
    frontmatter: markdown.slice(4, closingIndex),
    body: markdown.slice(closingIndex + 4).replace(/^\r?\n/, ""),
  };
}

function updateFrontmatterDate(frontmatter: string, updatedAt: string) {
  if (/^updatedAt:/m.test(frontmatter)) {
    return frontmatter.replace(/^updatedAt:.*$/m, `updatedAt: ${updatedAt}`);
  }

  return `${frontmatter.trimEnd()}\nupdatedAt: ${updatedAt}\n`;
}

export function composeChartMarkdown({
  originalMarkdown,
  nextRawText,
  updatedAt = new Date().toISOString(),
}: ChartMarkdownUpdateInput): string {
  const { frontmatter, body } = splitFrontmatter(originalMarkdown);
  if (body.trimEnd() === nextRawText.trimEnd()) {
    return originalMarkdown;
  }

  const nextBody = `${nextRawText.trimEnd()}\n`;

  return `---\n${updateFrontmatterDate(frontmatter, updatedAt).trimEnd()}\n---\n${nextBody}`;
}

export function createChartMarkdownProposal(input: ChartMarkdownUpdateInput): ChartMarkdownProposal {
  const updatedMarkdown = composeChartMarkdown(input);
  const proposal = createTextChangeProposal({
    path: input.sourcePath,
    before: input.originalMarkdown,
    after: updatedMarkdown,
  });

  return {
    ...proposal,
    updatedMarkdown,
  };
}
