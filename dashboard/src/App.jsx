import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  ARTISTS,
  COUNTRIES,
  MONTHS,
  PAGE_META,
  ROWS,
  STATS,
  TRACKS,
  YEARS,
} from "./data/dataset";
import { buildModel } from "./lib/model";
import { csvEscape } from "./lib/format";
import useTheme from "./hooks/useTheme";
import useFilters from "./hooks/useFilters";
import useHashRoute from "./hooks/useHashRoute";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import FilterBar from "./components/layout/FilterBar";
import CommandPalette from "./components/layout/CommandPalette";
import OverviewView from "./components/views/OverviewView";
import CountriesView from "./components/views/CountriesView";
import ArtistsView from "./components/views/ArtistsView";
import SongsView from "./components/views/SongsView";
import InsightsView from "./components/views/InsightsView";
import QualityView from "./components/views/QualityView";
import CountryModal from "./components/modals/CountryModal";
import ArtistModal from "./components/modals/ArtistModal";
import TrackModal from "./components/modals/TrackModal";
import { BrandMark } from "./components/ui/EntityBits";

const SIDEBAR_KEY = "spotify-intel-sidebar";

function initialSidebar() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch (error) {
    return false;
  }
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { view, navigate } = useHashRoute();
  const filterState = useFilters();
  const { filters, actions } = {
    filters: filterState.filters,
    actions: {
      setYear: filterState.setYear,
      setTopN: filterState.setTopN,
      setArtist: filterState.setArtist,
      setTrack: filterState.setTrack,
      toggleCountry: filterState.toggleCountry,
      setAllCountries: filterState.setAllCountries,
      isolateCountry: filterState.isolateCountry,
      toggleMonth: filterState.toggleMonth,
      setAllMonths: filterState.setAllMonths,
      reset: filterState.reset,
    },
  };

  const model = useMemo(() => buildModel(filterState.rows), [filterState.rows]);
  const baseModel = useMemo(
    () => buildModel(filterState.baseRows),
    [filterState.baseRows]
  );

  const [compare, setCompare] = useState(() => new Set());
  const [commandOpen, setCommandOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(initialSidebar);
  const [toasts, setToasts] = useState([]);
  const [bootDone, setBootDone] = useState(false);
  const meta = PAGE_META[view] || PAGE_META.overview;
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootDone(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = `Spotify Intelligence · ${meta.title}`;
  }, [meta.title]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch (error) {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => {
    const handler = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addToast = useCallback((message, kind = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const exportCsv = useCallback(() => {
    const header = ["year", "country", "month", "track", "artist", "monthly_streams"];
    const lines = [header];
    filterState.rows.forEach((row) => {
      lines.push([
        YEARS[row[0]],
        COUNTRIES[row[1]],
        MONTHS[row[2]],
        TRACKS[row[3]],
        ARTISTS[row[4]],
        row[5],
      ]);
    });
    const csv = lines.map((line) => line.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spotify-intelligence-filtered.csv";
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${filterState.rows.length.toLocaleString("en-US")} rows to CSV.`);
  }, [filterState.rows, addToast]);

  const toggleCompare = useCallback((name) => {
    setCompare((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const isolateCountry = useCallback(
    (name) => {
      actions.isolateCountry(name);
      addToast(`Filtered dashboard to ${name}.`);
    },
    [actions, addToast]
  );

  const openCountry = useCallback((name) => setModal({ type: "country", name }), []);
  const openArtist = useCallback((index) => setModal({ type: "artist", index }), []);
  const openTrack = useCallback((key) => setModal({ type: "track", key }), []);

  const viewProps = {
    model,
    baseModel,
    filters,
    theme,
    onOpenCountry: openCountry,
    onOpenArtist: openArtist,
    onOpenTrack: openTrack,
    onIsolateCountry: isolateCountry,
    onNavigate: navigate,
    onReset: actions.reset,
    onExport: exportCsv,
  };

  let content = null;
  if (view === "overview") content = <OverviewView {...viewProps} />;
  else if (view === "countries") {
    content = (
      <CountriesView
        {...viewProps}
        compare={compare}
        onToggleCompare={toggleCompare}
        onClearCompare={() => setCompare(new Set())}
      />
    );
  } else if (view === "artists") content = <ArtistsView {...viewProps} />;
  else if (view === "songs") content = <SongsView {...viewProps} />;
  else if (view === "insights") content = <InsightsView {...viewProps} />;
  else if (view === "quality") content = <QualityView {...viewProps} />;

  return (
    <>
      <div className={`boot${bootDone ? " done" : ""}`} aria-hidden="true">
        <div className="boot-inner">
          <BrandMark large />
          <div className="boot-copy">
            <strong>Spotify Intelligence</strong>
            <span>Preparing your listening intelligence workspace...</span>
          </div>
          <span className="boot-bar"><i /></span>
        </div>
      </div>

      <div className={`app${collapsed ? " sidebar-collapsed" : ""}${mobileNav ? " nav-open" : ""}`}>
        <div
          className="sidebar-scrim"
          hidden={!mobileNav}
          onClick={() => setMobileNav(false)}
        />
        <Sidebar
          view={view}
          navigate={navigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          stats={STATS}
          onCloseMobile={() => setMobileNav(false)}
        />

        <main className="main" id="main">
          <Topbar
            meta={meta}
            theme={theme}
            rowCount={model.rows}
            marketCount={model.countryList.length}
            collapsed={collapsed}
            onMenu={() => setMobileNav(true)}
            onCommand={() => setCommandOpen(true)}
            onExport={exportCsv}
            onTheme={toggle}
            onExpandSidebar={() => setCollapsed(false)}
          />
          <FilterBar
            filters={filters}
            actions={actions}
            activeCount={filterState.activeCount}
          />
          <div className="view-host" id="viewRoot" aria-live="polite">
            {content}
          </div>
          <footer className="page-footer">
            <span>
              Spotify Intelligence · Built from{" "}
              <code>top5_countries_monthly_2023/2024/2025_clean.csv</code>
            </span>
            <span className="footer-sep">·</span>
            <span>
              Demo dataset with known limitations — see{" "}
              <button className="link-btn" type="button" onClick={() => navigate("quality")}>
                Data Quality
              </button>
              .
            </span>
          </footer>
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        model={model}
        theme={theme}
        navigate={navigate}
        onReset={actions.reset}
        onExport={exportCsv}
        onTheme={toggle}
        onIsolate={isolateCountry}
        onArtist={actions.setArtist}
        onTrack={actions.setTrack}
      />

      {modal?.type === "country" && (
        <CountryModal
          name={modal.name}
          baseModel={baseModel}
          theme={theme}
          onClose={closeModal}
          onIsolate={isolateCountry}
          onCompare={toggleCompare}
          onNavigate={navigate}
        />
      )}
      {modal?.type === "artist" && (
        <ArtistModal
          artistIndex={modal.index}
          model={model}
          theme={theme}
          onClose={closeModal}
          onFilterArtist={(name) => {
            actions.setArtist(name);
            navigate("artists");
            addToast(`Filtered to ${name}.`);
          }}
          onOpenTrack={openTrack}
        />
      )}
      {modal?.type === "track" && (
        <TrackModal
          trackKey={modal.key}
          model={model}
          theme={theme}
          onClose={closeModal}
          onFilterTrack={(name) => {
            actions.setTrack(name);
            navigate("songs");
            addToast(`Filtered to ${name}.`);
          }}
          onOpenArtist={(index) => setModal({ type: "artist", index })}
        />
      )}

      <div className="toast-root" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.kind}`.trim()} key={toast.id}>
            {toast.kind === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
