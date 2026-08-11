import { useEffect, useMemo, useState } from "react";
import { analyzeChordChartText } from "@achorde/tab-editor";
import { transposeChordSymbol } from "@achorde/tab-renderer";
import { Tab, type TabStyleConfig } from "@achorde/tab-renderer/react";
import { NuqsAdapter } from "nuqs/adapters/react";
import { parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { createChartMarkdownProposal } from "../lib/chart-editing";
import { selectChartReading } from "../lib/chart-reading";

export type PortalChart = {
  id: string;
  title: string;
  workTitle: string;
  sourceKey: string;
  rawText: string;
  originalMarkdown: string;
  sourcePath: string;
  isLocal?: boolean;
};

export type PortalCatalogReaderProps = {
  charts: PortalChart[];
  catalogUrl: string;
  manifestUrl: string;
  editUrl?: string;
  readerUrl?: string;
  editing?: boolean;
};

const DEFAULT_FONT_SIZE = 21;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 34;
const MIN_TRANSPOSE = -11;
const MAX_TRANSPOSE = 11;
const DRAFT_STORAGE_PREFIX = "artist-portal-base:chart-draft:";
const NEW_CHARTS_STORAGE_KEY = "artist-portal-base:new-charts:v1";
const readingVersions = ["local", "published", "original"] as const;

const routeStateParsers = {
  chart: parseAsString,
  q: parseAsString.withDefault(""),
  transpose: parseAsInteger.withDefault(0),
  font: parseAsInteger.withDefault(DEFAULT_FONT_SIZE),
  version: parseAsStringLiteral(readingVersions).withDefault("local"),
  new: parseAsBoolean.withDefault(false),
};

function SimpleChartEditor({
  value,
  onChange,
  analysis,
}: {
  value: string;
  onChange: (value: string) => void;
  analysis: ReturnType<typeof analyzeChordChartText>;
}) {
  return (
    <section className="portal-simple-editor" aria-label="Editor de cifra">
      <textarea value={value} onChange={(event) => onChange(event.currentTarget.value)} spellCheck={false} aria-label="Texto da cifra" />
      {analysis.diagnostics.length > 0 ? (
        <details className="portal-editor-diagnostics">
          <summary>Ajuda para corrigir ({analysis.diagnostics.length})</summary>
          <ul>{analysis.diagnostics.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul>
        </details>
      ) : null}
    </section>
  );
}

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

export function PortalCatalogReader(props: PortalCatalogReaderProps) {
  return <NuqsAdapter><PortalCatalogReaderContent {...props} /></NuqsAdapter>;
}

function PortalCatalogReaderContent({
  charts,
  catalogUrl,
  manifestUrl,
  editUrl,
  readerUrl,
  editing = false,
}: PortalCatalogReaderProps) {
  const [allCharts, setAllCharts] = useState(charts);
  const [{ chart: selectedId, q: query, transpose: transposeNumber, font: fontSize, version, new: isCreating }, setRouteState] = useQueryStates(routeStateParsers);
  const [copyMessage, setCopyMessage] = useState("");
  const [draftText, setDraftText] = useState("");
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");

  const visibleCharts = useMemo(
    () => allCharts.filter((chart) => includesQuery(chart, query)),
    [allCharts, query],
  );

  const selectedChart = visibleCharts.find((chart) => chart.id === selectedId) ?? visibleCharts[0];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NEW_CHARTS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((chart) => chart && typeof chart.id === "string" && typeof chart.rawText === "string")) {
        setAllCharts((current) => [...current, ...parsed.filter((candidate) => !current.some((chart) => chart.id === candidate.id))]);
      }
    } catch {
      // A new local song remains available for the current session if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (selectedChart && selectedChart.id !== selectedId) {
      void setRouteState({ chart: selectedChart.id });
    }
  }, [selectedChart, selectedId, setRouteState]);

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

  useEffect(() => {
    if (!selectedChart || !draftText) return;

    const storageKey = `${DRAFT_STORAGE_PREFIX}${selectedChart.id}`;
    if (draftText === selectedChart.rawText) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // The equal in-memory text still is not treated as a local version.
      }
      setHasStoredDraft(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, draftText);
        setHasStoredDraft(true);
      } catch {
        setCopyMessage("A edição continua aberta, mas este aparelho não conseguiu salvá-la.");
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [draftText, selectedChart]);

  if (!selectedChart && query.trim()) {
    return (
      <section className="portal-reader portal-reader-empty">
        <label className="portal-search">
          <span>Encontrar música</span>
          <input value={query} onChange={(event) => void setRouteState({ q: event.currentTarget.value })} autoFocus />
        </label>
        <h2>Nenhuma música encontrada</h2>
        <p>Tente outro nome ou limpe a busca.</p>
      </section>
    );
  }

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
  const editAnalysis = useMemo(() => analyzeChordChartText(draftText), [draftText]);
  const hasChanges = draftText !== selectedChart.rawText;
  const hasLocalVersion = selectedChart.isLocal || hasStoredDraft;
  const reading = selectChartReading({
    publishedText: selectedChart.rawText,
    localText: version === "published" ? null : hasStoredDraft ? draftText : null,
    isLocalChart: selectedChart.isLocal,
    viewingOriginal: version === "original",
  });
  const validationState =
    editAnalysis.status === "invalid"
      ? "invalido"
      : editAnalysis.status === "warning"
        ? "com avisos"
        : "valido";

  function chooseChart(chart: PortalChart) {
    void setRouteState({ chart: chart.id, version: "local" }, { history: "push" });
  }

  function setReadingVersion(nextVersion: (typeof readingVersions)[number]) {
    void setRouteState({ version: nextVersion }, { history: "push" });
  }

  function addLocalSong() {
    const title = newTitle.trim();
    const rawText = newText.trim();
    if (!title || !rawText) {
      setCopyMessage("Escreva o nome e a cifra antes de adicionar a música.");
      return;
    }
    const slug = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "nova-musica";
    const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
    const id = `local:${slug}:${suffix}`;
    const sourcePath = `catalog/charts/${slug}/principal.md`;
    const originalMarkdown = `---\nid: ${id}\nupdatedAt: ${new Date().toISOString()}\nwork:\n  id: ${id}\n  title: ${title}\n  slug: ${slug}\nversion:\n  title: Principal\n  slug: principal\n  kind: arrangement\n  sourceKey: C\n  instrumentId: guitar\n  tuningId: guitar-standard\n---\n${rawText}\n`;
    const chart: PortalChart = { id, title: "Principal", workTitle: title, sourceKey: "C", rawText, originalMarkdown, sourcePath, isLocal: true };
    setAllCharts((current) => [...current, chart].sort((left, right) => left.workTitle.localeCompare(right.workTitle)));
    void setRouteState({ chart: id, new: false, version: "local" }, { history: "push" });
    setNewTitle("");
    setNewText("");
    try {
      const current = JSON.parse(window.localStorage.getItem(NEW_CHARTS_STORAGE_KEY) ?? "[]");
      window.localStorage.setItem(NEW_CHARTS_STORAGE_KEY, JSON.stringify([...Array.isArray(current) ? current : [], chart]));
      setHasStoredDraft(true);
      setCopyMessage("Nova música salva neste aparelho. Ainda não enviada.");
    } catch {
      setCopyMessage("Nova música aberta nesta sessão. Este aparelho não conseguiu salvá-la.");
    }
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
      if (draftText === selectedChart.rawText) {
        window.localStorage.removeItem(storageKey);
        setHasStoredDraft(false);
        return;
      }
      window.localStorage.setItem(storageKey, draftText);
      setHasStoredDraft(true);
    } catch {
      setCopyMessage("Não foi possível salvar neste aparelho; copie o Markdown.");
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
    void setRouteState({ version: "published" });
  }

  function getReaderUrl() {
    if (!readerUrl) return null;
    const nextSearch = new URLSearchParams({ chart: selectedChart.id, version: "local" });
    if (query) nextSearch.set("q", query);
    if (transposeNumber) nextSearch.set("transpose", String(transposeNumber));
    if (fontSize !== DEFAULT_FONT_SIZE) nextSearch.set("font", String(fontSize));
    return `${readerUrl}?${nextSearch.toString()}`;
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
          <span>Encontrar música</span>
          <input
            value={query}
            onChange={(event) => void setRouteState({ q: event.currentTarget.value })}
            placeholder="Digite o nome de uma música"
          />
        </label>

        <div className="portal-stepper" aria-label="Tom">
          <span>Tom</span>
          <button
            type="button"
            onClick={() => void setRouteState({ transpose: clamp(transposeNumber - 1, MIN_TRANSPOSE, MAX_TRANSPOSE) })}
            disabled={transposeNumber <= MIN_TRANSPOSE}
            aria-label="Diminuir tom"
          >
            -
          </button>
          <strong>{visualKey}</strong>
          <button
            type="button"
            onClick={() => void setRouteState({ transpose: clamp(transposeNumber + 1, MIN_TRANSPOSE, MAX_TRANSPOSE) })}
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
            onClick={() => void setRouteState({ font: clamp(fontSize - 1, MIN_FONT_SIZE, MAX_FONT_SIZE) })}
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Diminuir fonte"
          >
            -
          </button>
          <strong>{fontSize}px</strong>
          <button
            type="button"
            onClick={() => void setRouteState({ font: clamp(fontSize + 1, MIN_FONT_SIZE, MAX_FONT_SIZE) })}
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
            <h2>Músicas</h2>
            <span>{visibleCharts.length}/{allCharts.length}</span>
          </div>
          {editing ? <button type="button" className="portal-add-song" onClick={() => void setRouteState({ new: true }, { history: "push" })}>Adicionar música</button> : null}
          <div className="portal-song-buttons">
            {visibleCharts.map((chart) => (
              <button
                key={chart.id}
                type="button"
                className={chart.id === selectedChart.id ? "is-active" : ""}
                onClick={() => chooseChart(chart)}
              >
                <span>{chart.workTitle}</span>
                <small>{hasStoredDraft && chart.id === selectedChart.id ? "Continue editando" : chart.title}</small>
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
              {!editing && editUrl ? <a className="portal-primary-action" href={`${editUrl}?chart=${encodeURIComponent(selectedChart.id)}&version=${version}`}>Editar cifra</a> : null}
            </div>
          </div>
          {!editing && hasLocalVersion ? (
            <p className="portal-copy-message">
              {reading.version === "original"
                ? "Você está vendo a versão original publicada."
                : "Salvo neste aparelho · Ainda não enviado"}
              {!selectedChart.isLocal ? (
                <button type="button" onClick={() => setReadingVersion(reading.version === "original" ? "local" : "original")}>
                  {reading.version === "original" ? "Ver minha versão" : "Ver versão original"}
                </button>
              ) : null}
            </p>
          ) : null}
          {copyMessage ? <p className="portal-feedback-message" role="status">{copyMessage}</p> : null}
          {!editing ? (
            <div className="portal-tab-shell">
              <Tab body={reading.text} style={tabStyle} />
            </div>
          ) : (
            <div className="portal-editor-shell">
              <div className="portal-editor-status" aria-label="Estado do rascunho">
                {selectedChart.isLocal || hasStoredDraft ? <span>Salvo neste aparelho · Ainda não enviado</span> : null}
                {!hasChanges && !selectedChart.isLocal && !hasStoredDraft ? <span>sem alterações</span> : null}
                {hasChanges ? <span data-status={editAnalysis.status}>{validationState}</span> : null}
              </div>
              <SimpleChartEditor value={draftText} onChange={setDraftText} analysis={editAnalysis} />
              <div className="portal-editor-actions">
                {editing && getReaderUrl() ? (
                  <a className="portal-primary-action" href={getReaderUrl() ?? undefined} onClick={saveDraft}>Salvar rascunho</a>
                ) : (
                  <button type="button" className="portal-primary-action" onClick={() => { saveDraft(); void setRouteState({ version: "local" }); }}>Concluir edição</button>
                )}
                <button type="button" onClick={discardDraft} disabled={!hasChanges && !hasStoredDraft}>
                  Descartar rascunho
                </button>
                <details className="portal-advanced-actions">
                  <summary>Opções avançadas</summary>
                  <button type="button" onClick={() => void copyMarkdown()}>Copiar Markdown</button>
                  <button type="button" onClick={downloadMarkdown}>Baixar Markdown</button>
                  <button type="button" onClick={() => void copyProposal()}>Copiar proposta</button>
                </details>
              </div>
            </div>
          )}
        </article>
      </div>
      {isCreating ? (
        <section className="portal-new-song" aria-label="Adicionar música">
          <h2>Adicionar música</h2>
          <p>Comece só com o nome e a cifra. Você pode completar os detalhes ao enviar para revisão.</p>
          <label>Nome da música<input value={newTitle} onChange={(event) => setNewTitle(event.currentTarget.value)} autoFocus /></label>
          <label>Cifra<textarea value={newText} onChange={(event) => setNewText(event.currentTarget.value)} spellCheck={false} /></label>
          <div><button type="button" className="portal-primary-action" onClick={addLocalSong}>Salvar neste aparelho</button><button type="button" onClick={() => void setRouteState({ new: false })}>Cancelar</button></div>
        </section>
      ) : null}
    </section>
  );
}
