export type ChartReadingSelection = {
  publishedText: string;
  localText: string | null;
  isLocalChart?: boolean;
  viewingOriginal: boolean;
};

export type ChartReadingVersion = "local" | "original" | "published";

export function selectChartReading({
  publishedText,
  localText,
  isLocalChart = false,
  viewingOriginal,
}: ChartReadingSelection): { text: string; version: ChartReadingVersion } {
  if (isLocalChart) {
    return { text: localText ?? publishedText, version: "local" };
  }

  if (localText !== null && !viewingOriginal) {
    return { text: localText, version: "local" };
  }

  return { text: publishedText, version: viewingOriginal ? "original" : "published" };
}
