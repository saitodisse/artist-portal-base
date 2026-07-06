import { useEffect, useMemo, useState } from "react";
import { analyzeChordChartText } from "@achorde/tab-editor";
import { ChordChartEditor } from "@achorde/tab-editor/react";
import "@achorde/tab-editor/style.css";
import { transposeChordSymbol } from "@achorde/tab-renderer";
import { Tab, type TabStyleConfig } from "@achorde/tab-renderer/react";
import { createChartMarkdownProposal } from "../lib/chart-editing";

export type PortalChart = {
  id: string;
  title: string;
  workTitle: string;
  sourceKey: string;
  rawText: string;
  originalMarkdown: string;
  sourcePath: string;
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
const DRAFT_STORAGE_PREFIX = "artist-portal-base:chart-draft:";

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
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draftText, setDraftText] = useState("");
  const [hasStoredDraft, setHasStoredDraft] = useState(false);

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

  useEffect(() => {
    if (!selectedChart) return;

    const storageKey = `${DRAFT_STORAGE_PREFIX}${selectedChart.id}`;
    try {
      const storedDraft = window.localStorage.getItem(storageKey);
      if (storedDraft !== null) {
        setDraftText(storedDraft);
        setHasStoredDraft(true);
        return;
      }
    } catch {
      // Browsers can block localStorage; editing still works for the session.
    }

    setDraftText(selectedChart.rawText);
    setHasStoredDraft(false);
  }, [selectedChart]);

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
  const editorPreviewStyle: Partial<TabStyleConfig> = {
    ...tabStyle,
    transposeNumber: 0,
    fontSize: 16,
    lineHeight: 0.18,
  };
  const editAnalysis = useMemo(() => analyzeChordChartText(draftText), [draftText]);
  const hasChanges = draftText !== selectedChart.rawText;
  const validationState =
    editAnalysis.status === "invalid"
      ? "invalido"
      : editAnalysis.status === "warning"
        ? "com avisos"
        : "valido";

  function chooseChart(chart: PortalChart) {
    setSelectedId(chart.id);
    setMode("read");
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

  function saveDraft() {
    const storageKey = `${DRAFT_STORAGE_PREFIX}${selectedChart.id}`;
    try {
      window.localStorage.setItem(storageKey, draftText);
      setHasStoredDraft(true);
      setCopyMessage("Rascunho salvo neste navegador.");
    } catch {
      setCopyMessage("Nao foi possivel salvar no navegador; copie o Markdown.");
    }
  }

  function discardDraft() {
    const storageKey = `${DRAFT_STORAGE_PREFIX}${selectedChart.id}`;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors; the in-memory draft can still be reset.
    }
    setDraftText(selectedChart.rawText);
    setHasStoredDraft(false);
    setCopyMessage("Rascunho descartado.");
  }

  async function copyText(text: string, fallbackMessage: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(successMessage);
    } catch {
      setCopyMessage(fallbackMessage);
    }
  }

  async function copyMarkdown() {
    const proposal = createChartMarkdownProposal({
      sourcePath: selectedChart.sourcePath,
      originalMarkdown: selectedChart.originalMarkdown,
      nextRawText: draftText,
    });
    await copyText(proposal.updatedMarkdown, "Markdown pronto para copiar.", "Markdown copiado.");
  }

  function downloadMarkdown() {
    const proposal = createChartMarkdownProposal({
      sourcePath: selectedChart.sourcePath,
      originalMarkdown: selectedChart.originalMarkdown,
      nextRawText: draftText,
    });
    const blob = new Blob([proposal.updatedMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedChart.sourcePath.split("/").pop() ?? `${selectedChart.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setCopyMessage("Markdown baixado.");
  }

  async function copyProposal() {
    const proposal = createChartMarkdownProposal({
      sourcePath: selectedChart.sourcePath,
      originalMarkdown: selectedChart.originalMarkdown,
      nextRawText: draftText,
    });
    await copyText(
      JSON.stringify(proposal, null, 2),
      "Proposta pronta para copiar.",
      "Proposta copiada.",
    );
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
              <div className="portal-mode-toggle" aria-label="Modo da cifra">
                <button
                  type="button"
                  className={mode === "read" ? "is-active" : ""}
                  onClick={() => setMode("read")}
                >
                  Ler
                </button>
                <button
                  type="button"
                  className={mode === "edit" ? "is-active" : ""}
                  onClick={() => setMode("edit")}
                >
                  Editar
                </button>
              </div>
              <button type="button" onClick={() => void copyCatalogUrl()}>
                Import catalog
              </button>
              <a href={manifestUrl}>source-manifest.json</a>
            </div>
          </div>
          {copyMessage ? <p className="portal-copy-message">{copyMessage}</p> : null}
          {mode === "read" ? (
            <div className="portal-tab-shell">
              <Tab body={selectedChart.rawText} style={tabStyle} />
            </div>
          ) : (
            <div className="portal-editor-shell">
              <div className="portal-editor-status" aria-label="Estado do rascunho">
                {!hasChanges ? <span>sem alteracoes</span> : null}
                {hasChanges && hasStoredDraft ? <span>rascunho local</span> : null}
                {hasChanges ? <span data-status={editAnalysis.status}>{validationState}</span> : null}
              </div>
              <ChordChartEditor
                value={draftText}
                originalValue={selectedChart.rawText}
                title={selectedChart.workTitle}
                sourceKey={selectedChart.sourceKey}
                onChange={setDraftText}
                onSave={saveDraft}
                previewStyle={editorPreviewStyle}
                labels={{
                  editorTitle: "Editor",
                  previewTitle: "Preview",
                  diagnosticsTitle: "Diagnosticos",
                  save: "Salvar rascunho",
                  valid: "Valido",
                  warning: "Com avisos",
                  invalid: "Invalido",
                  noDiagnostics: "Sem diagnosticos.",
                  loadingEditor: "Carregando editor.",
                  fallbackEditor: "Editor de texto",
                  chordsFound: "Acordes encontrados",
                }}
              />
              <div className="portal-editor-actions">
                <button type="button" onClick={saveDraft} disabled={!hasChanges}>
                  Salvar rascunho
                </button>
                <button type="button" onClick={discardDraft} disabled={!hasChanges && !hasStoredDraft}>
                  Descartar rascunho
                </button>
                <button type="button" onClick={() => void copyMarkdown()}>
                  Copiar Markdown
                </button>
                <button type="button" onClick={downloadMarkdown}>
                  Baixar Markdown
                </button>
                <button type="button" onClick={() => void copyProposal()}>
                  Copiar proposta
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
