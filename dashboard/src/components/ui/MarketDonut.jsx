import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Maximize2, Minimize2 } from "lucide-react";
import { COUNTRY_COLORS } from "../../data/dataset";
import { donutConfig } from "../../lib/charts";
import { fmtCompact, fmtPct } from "../../lib/format";
import ChartCanvas from "./ChartCanvas";

function saveChart(chart) {
  if (!chart) return;
  const link = document.createElement("a");
  link.download = "spotify-intelligence-market-distribution.png";
  link.href = chart.toBase64Image("image/png", 1);
  link.click();
}

export default function MarketDonut({
  model,
  theme,
  span = "span-4",
  onSlice,
  onIsolate,
  title = "Market distribution",
  subtitle = "Share of recorded values in scope.",
}) {
  const [chart, setChart] = useState(null);
  const [full, setFull] = useState(false);
  const cardRef = useRef(null);

  const config = useMemo(() => donutConfig(model, theme, onSlice), [model, theme, onSlice]);

  useEffect(() => {
    if (!full) return undefined;
    document.body.classList.add("chart-focus");
    const handler = (event) => {
      if (event.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.classList.remove("chart-focus");
    };
  }, [full]);

  const colors = model.countryList.map((country) => COUNTRY_COLORS[country.name] || "#1db954");

  return (
    <div
      ref={cardRef}
      className={`card ${span}${full ? " is-fullscreen" : ""}`}
    >
      {full && (
        <button
          className="chart-focus-close"
          type="button"
          onClick={() => setFull(false)}
          aria-label="Close fullscreen chart"
        >
          <Minimize2 size={14} />
          <span>Exit fullscreen</span>
        </button>
      )}
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="card-tools">
          <button
            className="card-tool"
            type="button"
            onClick={() => saveChart(chart)}
            title="Download chart as PNG"
            aria-label="Download chart as PNG"
          >
            <Image size={13} />
          </button>
          <button
            className="card-tool"
            type="button"
            onClick={() => setFull((value) => !value)}
            title="Toggle fullscreen chart"
            aria-label="Toggle fullscreen chart"
          >
            {full ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>
      <div className="donut-layout">
        <div className="donut-canvas">
          <ChartCanvas
            config={config}
            className=""
            onReady={setChart}
            ariaLabel="Market share of recorded values"
          />
        </div>
        <div className="donut-legend">
          {model.countryList.map((country, index) => (
            <button
              className="donut-legend-item"
              key={country.name}
              type="button"
              onClick={() => onIsolate && onIsolate(country.name)}
              title={`Filter to ${country.name}`}
            >
              <span className="donut-dot" style={{ background: colors[index] }} />
              <span className="donut-legend-main">
                <strong>{country.name}</strong>
                <span>{fmtCompact(country.streams)}</span>
              </span>
              <span className="donut-legend-value">{fmtPct(country.share)}</span>
            </button>
          ))}
          {!model.countryList.length && (
            <span className="faint">No markets in the current scope.</span>
          )}
        </div>
      </div>
      <div className="card-caption">
        Click a legend row to isolate that market. Click a slice to open the market profile.
      </div>
    </div>
  );
}
