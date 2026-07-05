import { useEffect, useMemo, useState } from "react";
import { transposeChordSymbol } from "@achorde/tab-renderer";
import { Tab, type TabStyleConfig } from "@achorde/tab-renderer/react";

export type PortalChart = {
  id: string;
  title: string;
  workTitle: string;
  sourceKey: string;
  rawText: string;
};

export type PortalCatalogReaderProps = {
  charts: PortalChart[];
  catalogUrl: string;
  manifestUrl: string;
};

const DEFAULT_FONT_SIZE = 21;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 34;
const MIN_TRANSPOSE = -11;
const MAX_TRANSPOSE = 11;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function includesQuery(chart: PortalChart, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [chart.title, chart.workTitle, chart.sourceKey, chart.rawText].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}

export function PortalCatalogReader({
  charts,
  catalogUrl,
  manifestUrl,
}: PortalCatalogReaderProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(charts[0]?.id ?? "");
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [transposeNumber, setTransposeNumber] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");

  const visibleCharts = useMemo(
    () => charts.filter((chart) => includesQuery(chart, query)),
    [charts, query],
  );

  const selectedChart =
    visibleCharts.find((chart) => chart.id === selectedId) ?? visibleCharts[0] ?? charts[0];

  useEffect(() => {
    const selectFromHash = () => {
      const hashId = window.location.hash.replace(/^#/, "");
      if (charts.some((chart) => chart.id === hashId)) {
        setSelectedId(hashId);
      }
    };

    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [charts]);

  useEffect(() => {
    if (selectedChart && selectedChart.id !== selectedId) {
      setSelectedId(selectedChart.id);
    }
  }, [selectedChart, selectedId]);

  if (!selectedChart) {
    return (
      <section className="portal-reader portal-reader-empty">
        <p>Nenhuma cifra publicada no catalogo.</p>
      </section>
    );
  }

  const visualKey = transposeChordSymbol(selectedChart.sourceKey, transposeNumber);
  const transposeLabel =
    transposeNumber === 0
      ? "Tom original"
      : transposeNumber > 0
        ? `+${transposeNumber}`
        : `${transposeNumber}`;
  const tabStyle: Partial<TabStyleConfig> = {
    transposeNumber,
    fontSize,
    lineHeight: 0.18,
    blockMarginRight: 0.582,
    chordHeight: 0.07,
    contentMarginRightPx: 0,
    chordColor: "#2452a3",
    lyricColor: "#171a1d",
    backgroundColor: "transparent",
    sectionTitleColor: "#c4472f",
    sectionTitleFontSize: Math.max(14, fontSize - 3),
    sectionGap: 18,
    viewMode: "e",
    displayMode: "both",
  };

  function chooseChart(chart: PortalChart) {
    setSelectedId(chart.id);
    window.history.replaceState(null, "", `#${chart.id}`);
  }

  async function copyCatalogUrl() {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopyMessage("URL de importacao copiada.");
    } catch {
      setCopyMessage("URL de importacao: " + catalogUrl);
    }
  }

  return (
    <section className="portal-reader" aria-label="Leitor de cifras">
      <div className="portal-reader-toolbar">
        <label className="portal-search">
          <span>Pesquisar</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Musica, tom ou trecho da cifra"
          />
        </label>

        <div className="portal-stepper" aria-label="Tom">
          <span>Tom</span>
          <button
            type="button"
            onClick={() => setTransposeNumber((value) => clamp(value - 1, MIN_TRANSPOSE, MAX_TRANSPOSE))}
            disabled={transposeNumber <= MIN_TRANSPOSE}
            aria-label="Diminuir tom"
          >
            -
          </button>
          <strong>{visualKey}</strong>
          <button
            type="button"
            onClick={() => setTransposeNumber((value) => clamp(value + 1, MIN_TRANSPOSE, MAX_TRANSPOSE))}
            disabled={transposeNumber >= MAX_TRANSPOSE}
            aria-label="Aumentar tom"
          >
            +
          </button>
          <small>{transposeLabel}</small>
        </div>

        <div className="portal-stepper" aria-label="Tamanho da fonte">
          <span>Fonte</span>
          <button
            type="button"
            onClick={() => setFontSize((value) => clamp(value - 1, MIN_FONT_SIZE, MAX_FONT_SIZE))}
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Diminuir fonte"
          >
            -
          </button>
          <strong>{fontSize}px</strong>
          <button
            type="button"
            onClick={() => setFontSize((value) => clamp(value + 1, MIN_FONT_SIZE, MAX_FONT_SIZE))}
            disabled={fontSize >= MAX_FONT_SIZE}
            aria-label="Aumentar fonte"
          >
            +
          </button>
        </div>
      </div>

      <div className="portal-reader-grid">
        <aside className="portal-song-list" aria-label="Cifras publicadas">
          <div className="portal-song-list-header">
            <h2>Cifras publicadas</h2>
            <span>{visibleCharts.length}/{charts.length}</span>
          </div>
          <div className="portal-song-buttons">
            {visibleCharts.map((chart) => (
              <button
                key={chart.id}
                type="button"
                className={chart.id === selectedChart.id ? "is-active" : ""}
                onClick={() => chooseChart(chart)}
              >
                <span>{chart.workTitle}</span>
                <small>{chart.sourceKey} · {chart.title}</small>
              </button>
            ))}
          </div>
        </aside>

        <article id={selectedChart.id} className="portal-chart-panel">
          <div className="portal-chart-header">
            <div>
              <p>{selectedChart.sourceKey} original · {visualKey} na tela</p>
              <h2>{selectedChart.workTitle}</h2>
            </div>
            <div className="portal-catalog-actions">
              <button type="button" onClick={() => void copyCatalogUrl()}>
                Import catalog
              </button>
              <a href={manifestUrl}>source-manifest.json</a>
            </div>
          </div>
          {copyMessage ? <p className="portal-copy-message">{copyMessage}</p> : null}
          <div className="portal-tab-shell">
            <Tab body={selectedChart.rawText} style={tabStyle} />
          </div>
        </article>
      </div>
    </section>
  );
}
