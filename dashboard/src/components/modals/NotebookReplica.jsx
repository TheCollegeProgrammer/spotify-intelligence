import { useMemo, useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import {
  COUNTRY_CODE,
  COUNTRY_COLORS,
  MONTH_NAMES,
  NOTEBOOK,
  REACH_COLORS,
  ROWS,
} from "../../data/dataset";
import { themeColors, tooltipStyle } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, truncate, withAlpha } from "../../lib/format";
import { buildModel } from "../../lib/model";
import ChartCard from "../ui/ChartCard";

const YEAR_2025 = 2;

function replicaData() {
  return buildModel(ROWS.filter((row) => row[0] === YEAR_2025));
}

function countryConfig(model, theme) {
  const t = themeColors();
  return {
    type: "bar",
    data: {
      labels: model.countryList.map((country) => COUNTRY_CODE[country.name]),
      datasets: [
        {
          data: model.countryList.map((country) => country.streams),
          backgroundColor: model.countryList.map((country) =>
            withAlpha(COUNTRY_COLORS[country.name] || "#1db954", 0.8)
          ),
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 28,
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
          callbacks: {
            label: (ctx) => ` ${model.countryList[ctx.dataIndex].name}: ${fmtInt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: t.muted, font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: (v) => fmtCompact(v) },
        },
      },
    },
    theme,
  };
}

function tracksConfig(model, theme) {
  const t = themeColors();
  const top = model.tracksList.slice(0, 8);
  return {
    type: "bar",
    data: {
      labels: top.map((track) => truncate(track.name, 22)),
      datasets: [
        {
          data: top.map((track) => track.streams),
          backgroundColor: top.map((track) => withAlpha(REACH_COLORS[(track.reach - 1) % 5], 0.8)),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: { label: (ctx) => ` ${fmtInt(ctx.parsed.x)} recorded values` },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: (v) => fmtCompact(v) },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: t.muted, font: { size: 9 } },
        },
      },
    },
    theme,
  };
}

function growthConfig(theme) {
  const t = themeColors();
  const nb = NOTEBOOK?.highestGrowth;
  const names = nb ? Object.keys(nb.seriesByCountry) : [];
  const first = names.length ? nb.seriesByCountry[names[0]] : [];
  const labels = first.map((point) => MONTH_NAMES[parseInt(point[0].slice(5), 10) - 1]);
  const datasets = names.map((name) => {
    const color = COUNTRY_COLORS[name] || "#1db954";
    const map = new Map(nb.seriesByCountry[name]);
    return {
      label: name,
      data: first.map((point) => map.get(point[0]) || 0),
      borderColor: color,
      backgroundColor: withAlpha(color, 0.12),
      fill: false,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 2.4,
      pointHoverRadius: 4,
      pointBackgroundColor: color,
    };
  });
  return {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: t.muted, boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 9.5 } },
        },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: t.faint, font: { size: 9 } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: (v) => fmtCompact(v) },
        },
      },
    },
    theme,
  };
}

export default function NotebookReplica({ theme }) {
  const [open, setOpen] = useState(false);
  const model = useMemo(() => replicaData(), []);
  const nb = NOTEBOOK?.highestGrowth;
  const countries = useMemo(
    () => (open ? countryConfig(model, theme) : null),
    [model, theme, open]
  );
  const tracks = useMemo(
    () => (open ? tracksConfig(model, theme) : null),
    [model, theme, open]
  );
  const growth = useMemo(() => (open ? growthConfig(theme) : null), [theme, open]);

  return (
    <div className="card span-12">
      <div className="card-head">
        <div>
          <h2>Notebook replica</h2>
          <p>Reproduce the original charts and expose the growth bug.</p>
        </div>
        <span className="card-tag">2025 · all markets</span>
      </div>
      <details
        className="replica"
        id="notebookReplica"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>
          <NotebookPen size={15} />
          Open notebook analysis
          <ChevronDown size={14} className="chev" />
        </summary>
        {open && (
          <div className="replica-body">
            <div className="replica-note">
              <strong>Note:</strong> the notebook sorts by track/artist/month and diffs
              consecutive rows. Because countries share months, the "highest growth" row
              is a between-country difference, not a time-series gain. The chart below
              reproduces that exact logic.
            </div>
            <div className="grid">
              <ChartCard
                title="Country totals"
                subtitle="2025, all markets."
                config={countries}
                span="span-6"
                className="flat"
                chartClassName=""
                chartLabel="2025 country totals"
              />
              <ChartCard
                title="Top tracks"
                subtitle="2025, all markets."
                config={tracks}
                span="span-6"
                className="flat"
                chartClassName=""
                chartLabel="2025 top tracks"
              />
              <ChartCard
                title={nb ? `${nb.track} · by market` : "Growth artifact"}
                subtitle="Every market series for the notebook's top growth track."
                config={growth}
                span="span-12"
                className="flat"
                chartClassName="tall"
                chartLabel="Notebook growth artifact by market"
              />
            </div>
            {nb && (
              <div className="qa-list" style={{ marginTop: 12 }}>
                <div className="qa-item">
                  <div className="qa-q">Notebook headline</div>
                  <div className="qa-a">
                    {nb.country} · {nb.month} · +{fmtInt(nb.diff)} recorded values
                  </div>
                </div>
                <div className="qa-item">
                  <div className="qa-q">Why it is misleading</div>
                  <div className="qa-a">
                    The positive difference compares two countries in the same month, not
                    one market over time.
                  </div>
                </div>
                <div className="qa-item">
                  <div className="qa-q">Verified dataset fact</div>
                  <div className="qa-a">
                    Every (country, track) pair has only two distinct monthly values, in a
                    1.25× ratio ({fmtPct(100)} of pairs).
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </details>
    </div>
  );
}
