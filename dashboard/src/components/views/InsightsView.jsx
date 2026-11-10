import { useMemo } from "react";
import { CircleAlert, CircleCheck, TrendingUp, TriangleAlert } from "lucide-react";
import {
  COUNTRIES,
  COUNTRY_COLORS,
  REACH_COLORS,
  STATS,
} from "../../data/dataset";
import { monthlyLineConfig, themeColors, tooltipStyle } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, monthLabel, withAlpha } from "../../lib/format";
import { onlyMarketTracks } from "../../lib/model";
import ChartCard from "../ui/ChartCard";
import { CountryChip } from "../ui/EntityBits";
import { Notice, StatTile, ViewHead } from "../ui/Primitives";

function yearlyConfig(theme) {
  const t = themeColors();
  return {
    type: "bar",
    data: {
      labels: Object.keys(STATS.yearTotals),
      datasets: [
        {
          data: Object.values(STATS.yearTotals),
          backgroundColor: Object.keys(STATS.yearTotals).map((_, i) =>
            withAlpha(COUNTRY_COLORS[COUNTRIES[i]] || "#1db954", 0.8)
          ),
          borderRadius: 6,
          maxBarThickness: 58,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: { label: (ctx) => ` Recorded values: ${fmtInt(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.muted, font: { size: 11, weight: "600" } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, callback: (v) => fmtCompact(v) },
        },
      },
    },
    theme,
  };
}

function reachValueConfig(model, theme) {
  const t = themeColors();
  const values = [1, 2, 3, 4, 5].map((reach) =>
    model.tracksList
      .filter((track) => track.reach === reach)
      .reduce((total, track) => total + track.streams, 0)
  );
  return {
    type: "bar",
    data: {
      labels: [1, 2, 3, 4, 5].map((n) => `${n} market${n === 1 ? "" : "s"}`),
      datasets: [
        {
          data: values,
          backgroundColor: REACH_COLORS.map((color) => withAlpha(color, 0.78)),
          hoverBackgroundColor: REACH_COLORS,
          borderRadius: 5,
          maxBarThickness: 34,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: { label: (ctx) => ` Recorded values: ${fmtInt(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.muted, font: { size: 9.5, weight: "600" } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, callback: (v) => fmtCompact(v) },
        },
      },
    },
    theme,
  };
}

export default function InsightsView({ model, baseModel, theme, onNavigate }) {
  const totals = useMemo(
    () => STATS.trackAppearances,
    []
  );
  const broad = model.tracksList.filter((track) => track.reach >= 4);
  const allFive = model.tracksList.filter((track) => track.reach === 5);
  const yearVals = Object.values(STATS.yearTotals);
  const identical = new Set(yearVals).size === 1;

  const yearly = useMemo(() => yearlyConfig(theme), [theme]);
  const reachValue = useMemo(() => reachValueConfig(model, theme), [model, theme]);
  const pattern = useMemo(
    () =>
      monthlyLineConfig(
        model.activeMonths.map((mi) => monthLabel(mi, model.activeMonths.length)),
        model.activeMonths.map((mi) => model.monthTotals[mi]),
        "#22d3ee",
        "Recorded values",
        theme
      ),
    [model, theme]
  );

  const marketOnly = COUNTRIES.map((name) => {
    const ci = COUNTRIES.indexOf(name);
    return {
      name,
      count: onlyMarketTracks(baseModel, ci).length,
      catalogue: baseModel.countryTracks[ci].size,
    };
  });

  const qa = [
    ["Did recorded values grow year over year?", "No measurable change. All three years total " + fmtInt(yearVals[0]) + "."],
    ["Is the monthly pattern seasonal?", "No. The same two-level 1.25× step repeats, with high months fixed by year and shared across markets."],
    ["Which market leads?", baseModel.countryList[0] ? `${baseModel.countryList[0].name} with ${fmtPct(baseModel.countryList[0].share)} of current-scope values.` : "No market in scope."],
    ["Can this support a forecast?", "No. The source totals are mirrored across years; there is no independent time signal to forecast."],
    ["Why do so many tracks appear once?", "761 of 873 tracks appear in a single market. The source provides 200 track rows per market per month, with limited overlap."],
  ];

  return (
    <div className="view-root">
      <ViewHead
        eyebrow="Growth & insights"
        icon={TrendingUp}
        title="What this dataset can and cannot support"
        subtitle="The dashboard is deliberately honest about the mirrored yearly totals, repeated monthly levels and limited cross-market catalogue."
        actions={
          <button className="btn" type="button" onClick={() => onNavigate("quality")}>
            Open data quality
          </button>
        }
      />

      <Notice
        kind="warning"
        icon={TriangleAlert}
        title="No genuine year-over-year growth signal"
        action={<button className="link-btn" type="button" onClick={() => onNavigate("quality")}>Read the integrity findings →</button>}
      >
        Each yearly file totals <strong>{fmtInt(yearVals[0])}</strong>. Differences appear
        only inside the mirrored source pattern, so growth and seasonality claims are not
        supported by this demo dataset.
      </Notice>

      <div className="quality-stat-grid" style={{ marginTop: 14 }}>
        <StatTile label="Years" value="3" sub="2023 – 2025" />
        <StatTile label="Year totals" value={identical ? "Identical" : "Vary"} sub={fmtCompact(yearVals[0])} tone={identical ? "warn" : ""} />
        <StatTile label="Monthly ratio" value="1.25×" sub="Two repeating levels" />
        <StatTile label="Distinct tracks" value={fmtInt(model.tracksList.length)} sub={`${fmtInt(model.artistsList.length)} artists`} />
        <StatTile label="Broad reach" value={fmtInt(broad.length)} sub="4–5 markets" />
        <StatTile label="All five" value={fmtInt(allFive.length)} sub="Only one track" />
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <ChartCard
          title="Yearly recorded values"
          subtitle="Totals by source year. The three bars are intentionally identical."
          config={yearly}
          span="span-6"
          chartClassName="tall"
          chartLabel="Yearly recorded values"
          caption="Identical totals are a source characteristic, not a rendering error."
        />
        <ChartCard
          title="Value by track reach"
          subtitle="Recorded values grouped by how many markets a track appears in."
          config={reachValue}
          span="span-6"
          chartClassName="tall"
          chartLabel="Recorded values by track reach"
          caption="Single-market tracks dominate the catalogue, but broad-reach tracks carry a larger share of values."
        />

        <ChartCard
          title="Monthly recorded pattern"
          subtitle="The recorded totals across the active months in scope."
          config={pattern}
          span="span-12"
          chartClassName="xl"
          chartLabel="Monthly recorded value pattern"
          caption="High months are global and shared across markets. The pattern is structural, not organic seasonality."
        />

        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2>Broad-reach catalogue</h2>
              <p>Tracks present in four or five markets.</p>
            </div>
            <span className="card-tag">{broad.length} tracks</span>
          </div>
          <div className="split-list">
            {broad.map((track) => (
              <div className="split-row" key={track.key}>
                <span>
                  <strong>{track.name}</strong>
                  <span className="faint"> · {track.artistName}</span>
                </span>
                <span className="badge neutral">{track.reach} markets</span>
              </div>
            ))}
            {!broad.length && <div className="empty-inline">No broad-reach tracks in this scope.</div>}
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2>Market-only catalogue</h2>
              <p>How much of each market is unique.</p>
            </div>
            <span className="card-tag">Reach = 1</span>
          </div>
          <div className="split-list">
            {marketOnly.map((item) => (
              <div className="split-row" key={item.name}>
                <span><CountryChip name={item.name} /></span>
                <strong>
                  {fmtInt(item.count)} <span className="faint">/ {fmtInt(item.catalogue)}</span>
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card span-12">
          <div className="card-head">
            <div>
              <h2>Questions this dataset can answer</h2>
              <p>Use these limits when presenting or extending the analysis.</p>
            </div>
            <span className="card-tag">5 checks</span>
          </div>
          <div className="qa-list">
            {qa.map(([question, answer], index) => {
              const positive = index === 2;
              return (
                <div className="qa-item" key={question}>
                  <div className="qa-q">
                    {positive ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
                    {question}
                  </div>
                  <div className="qa-a">{answer}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

