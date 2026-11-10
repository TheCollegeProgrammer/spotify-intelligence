import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ChartCanvas({
  config,
  className = "",
  onReady,
  ariaLabel = "Analytics chart",
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const readyRef = useRef(onReady);

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!config || !canvasRef.current) return undefined;
    const { theme, meta, ...chartConfig } = config;
    const chart = new Chart(canvasRef.current.getContext("2d"), {
      ...chartConfig,
      options: {
        ...chartConfig.options,
        responsive: true,
        maintainAspectRatio: false,
        animation: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? false
          : { duration: 520, easing: "easeOutQuart" },
      },
    });
    chartRef.current = chart;
    if (readyRef.current) readyRef.current(chart);

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        try {
          chart.resize();
        } catch (error) {
          console.warn("Chart resize failed", error);
        }
      });
    });
    if (canvasRef.current.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (readyRef.current) readyRef.current(null);
      try {
        chart.destroy();
      } catch (error) {
        console.warn("Chart destroy failed", error);
      }
      chartRef.current = null;
    };
  }, [config]);

  return (
    <div className={`chart-wrap ${className}`.trim()}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
    </div>
  );
}
