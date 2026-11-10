import { useCallback, useEffect, useState } from "react";
import { Image, Maximize2, Minimize2 } from "lucide-react";
import ChartCanvas from "./ChartCanvas";

function downloadChart(chart, title) {
  if (!chart) return;
  const link = document.createElement("a");
  const safe = String(title || "chart")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.download = `spotify-intelligence-${safe}.png`;
  link.href = chart.toBase64Image("image/png", 1);
  link.click();
}

export default function ChartCard({
  title,
  subtitle,
  config,
  span = "span-8",
  className = "",
  chartClassName = "tall",
  tag,
  actions,
  caption,
  after,
  children,
  onChartReady,
  chartLabel,
}) {
  const [chart, setChart] = useState(null);
  const [full, setFull] = useState(false);

  const handleReady = useCallback(
    (instance) => {
      setChart(instance);
      if (onChartReady) onChartReady(instance);
    },
    [onChartReady]
  );

  useEffect(() => {
    if (!full) return undefined;
    const previous = document.body.classList.contains("chart-focus");
    document.body.classList.add("chart-focus");
    const onKey = (event) => {
      if (event.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (!previous) document.body.classList.remove("chart-focus");
    };
  }, [full]);

  return (
    <div
      className={`card ${span} ${className}${full ? " is-fullscreen" : ""}`.trim()}
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
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="card-tools">
          {actions}
          {tag && <span className="card-tag">{tag}</span>}
          {config && (
            <>
              <button
                className="card-tool"
                type="button"
                onClick={() => downloadChart(chart, title)}
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
            </>
          )}
        </div>
      </div>
      {config ? (
        <ChartCanvas
          config={config}
          className={chartClassName}
          onReady={handleReady}
          ariaLabel={chartLabel || title}
        />
      ) : (
        children
      )}
      {after}
      {caption && <div className="card-caption">{caption}</div>}
    </div>
  );
}
