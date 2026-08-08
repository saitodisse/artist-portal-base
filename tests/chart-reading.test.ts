import { describe, expect, it } from "vitest";
import { selectChartReading } from "../src/lib/chart-reading";

describe("chart reading selection", () => {
  const publishedText = "C G Am F";
  const localText = "Dm G C";

  it("uses the local version by default when one was saved", () => {
    expect(selectChartReading({ publishedText, localText, viewingOriginal: false })).toEqual({
      text: localText,
      version: "local",
    });
  });

  it("shows the published original when requested", () => {
    expect(selectChartReading({ publishedText, localText, viewingOriginal: true })).toEqual({
      text: publishedText,
      version: "original",
    });
  });

  it("returns to the published version after the local draft is discarded", () => {
    expect(selectChartReading({ publishedText, localText: null, viewingOriginal: false })).toEqual({
      text: publishedText,
      version: "published",
    });
  });

  it("keeps a locally created song local because it has no original", () => {
    expect(selectChartReading({ publishedText, localText, isLocalChart: true, viewingOriginal: true })).toEqual({
      text: localText,
      version: "local",
    });
  });
});
