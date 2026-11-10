import { useMemo, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { trendConfig } from "../../lib/charts";
import { fmtCompact, fmtPct } from "../../lib/format";
import ChartCard from "../ui/ChartCard";
import KpiGrid, { CoverageStrip, buildOverviewKpis } from "../ui/KpiGrid";
import MarketDonut from "../ui/MarketDonut";
import { MarketTable, RankList } from "../ui/RankingPanels";
import { EmptyState, Notice } from "../ui/Primitives";

const TREND_MODES = [
  ["flow", "Flow"],
  ["area", "Area"],
  ["line", "Line"],
  ["bar", "Bar"],
];

function TrendMeta({ meta }) {
  return (
    <div className="trend-meta">
      <div className="trend-chip">
        <span>Peak month</span>
        <strong>{meta.peakLabel}</strong>
      </div>
      <div className="trend-chip">
        <span>Peak value</span>
        <strong>{fmtCompact(meta.peakVal)}</strong>
      </div>
      <div className="trend-chip">
        <span>Monthly average</span>
        <strong>{fmtCompact(meta.avg)}</strong>
      </div>
      <div className="trend-chip">
        <span>Latest month</span>
        <strong>{fmtCompact(meta.latest)}</strong>
      </div>
    </div>
  );
}

export default function OverviewView({
  model,
  baseModel,
  filters,
  theme,
  onOpenCountry,
  onOpenArtist,
  onOpenTrack,
  onIsolateCountry,
  onNavigate,
  onReset,
}) {
  const [trendMode, setTrendMode] = useState("area");
  const kpis = useMemo(() => buildOverviewKpis(model), [model]);
  const trend = useMemo(
    () => trendConfig(model, model.countryList, trendMode, theme),
    [model, trendMode, theme]
  );
  const yearLabel = filters.year === "all" ? "2023 – 2025" : filters.year;
  const coverage = [
    { value: yearLabel, label: "Years" },
    { value: `${model.countryList.length} / 5`, label: "Markets" },
    { value: String(model.activeMonths.length), label: "Months" },
    { value: model.tracksList.length.toLocaleString("en-US"), label: "Tracks" },
    { value: model.artistsList.length.toLocaleString("en-US"), label: "Artists" },
    { value: model.rows.toLocaleString("en-US"), label: "Rows" },
  ];

  if (!model.rows) {
    return (
      <div className="view-root">
        <EmptyState
          title="No data in this scope"
          body="Every row has been filtered out. Reset the filters or broaden the year, country and month selection."
          onReset={onReset}
        />
      </div>
    );
  }

  return (
    <div className="view-root">
      <CoverageStrip items={coverage} />
      <KpiGrid items={kpis} />

      <div className="grid">
        <ChartCard
          title="Recorded value trend"
          subtitle="Monthly recorded values by market across the filtered scope."
          config={trend}
          span="span-8"
          className={`trend-card mode-${trendMode}`}
          chartClassName="tall"
          chartLabel="Monthly recorded value trend by market"
          actions={
            <div className="segmented" role="group" aria-label="Trend style">
              {TREND_MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={trendMode === value ? "active" : ""}
                  onClick={() => setTrendMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          }
          after={<TrendMeta meta={trend.meta} />}
          caption="Monthly values follow a two-level 1.25× source pattern. Treat peaks as recorded structure, not organic growth."
        />

        <MarketDonut
          model={model}
          theme={theme}
          onSlice={onOpenCountry}
          onIsolate={onIsolateCountry}
        />

        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2>Top artists</h2>
              <p>Ranked by recorded values in scope.</p>
            </div>
            <span className="card-tag">Top {filters.topN}</span>
          </div>
          <RankList
            items={model.artistsList}
            kind="artist"
            limit={filters.topN}
            onOpen={onOpenArtist}
          />
          <div className="card-caption">
            <button className="link-btn" type="button" onClick={() => onNavigate("artists")}>
              Open artist intelligence <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2>Top tracks</h2>
              <p>Ranked by recorded values in scope.</p>
            </div>
            <span className="card-tag">Top {filters.topN}</span>
          </div>
          <RankList
            items={model.tracksList}
            kind="track"
            limit={filters.topN}
            onOpen={onOpenTrack}
          />
          <div className="card-caption">
            <button className="link-btn" type="button" onClick={() => onNavigate("songs")}>
              Open track intelligence <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="card span-12">
          <div className="card-head">
            <div>
              <h2>Market snapshot</h2>
              <p>
                Portfolio view from the selected filters, ignoring market selection so all
                five stay comparable.
              </p>
            </div>
            <span className="card-tag">{baseModel.countryList.length} markets</span>
          </div>
          <MarketTable countries={baseModel.countryList} onOpen={onOpenCountry} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Notice
          kind="warning"
          icon={TriangleAlert}
          title="Demo dataset — read before citing trends"
          action={
            <button className="link-btn" type="button" onClick={() => onNavigate("quality")}>
              Open data quality <ArrowRight size={12} />
            </button>
          }
        >
          Every yearly file totals <strong>7,340,879,910,728</strong>, and monthly values
          repeat a two-level <strong>1.25×</strong> source pattern. This workspace is for
          comparison and exploration, not for claiming organic market growth.
        </Notice>
      </div>

      <div className="overview-footnote">
        <span>Top market share: {fmtPct(model.countryList[0]?.share || 0)}</span>
        <span>{model.countryList.length} markets represented</span>
        <span>{fmtCompact(model.total)} recorded values in scope</span>
      </div>
    </div>
  );
}
