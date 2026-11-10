import { COUNTRY_COLORS, MONTH_NAMES, MONTHS, MONTH_OF_YEAR } from "../data/dataset";
import { fmtCompact, fmtInt, fmtPct, monthLabel, withAlpha } from "./format";

export function themeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue("--text").trim(),
    muted: style.getPropertyValue("--muted").trim(),
    faint: style.getPropertyValue("--faint").trim(),
    grid: style.getPropertyValue("--grid").trim(),
    card: style.getPropertyValue("--card").trim(),
    border: style.getPropertyValue("--border").trim(),
    accent: style.getPropertyValue("--accent").trim(),
    isLight: document.documentElement.getAttribute("data-theme") === "light",
  };
}

export function tooltipStyle(t) {
  return {
    backgroundColor: t.isLight ? "#ffffff" : "#0e1722",
    titleColor: t.text,
    bodyColor: t.muted,
    footerColor: t.faint,
    borderColor: t.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxWidth: 8,
    boxHeight: 8,
    usePointStyle: true,
    titleFont: { size: 11.5, weight: "600" },
    bodyFont: { size: 11.5 },
  };
}

export const crosshairPlugin = {
  id: "crosshair",
  afterDraw(chart) {
    if (!chart.tooltip || !chart.tooltip.getActiveElements) return;
    const active = chart.tooltip.getActiveElements();
    if (!active.length) return;
    const x = active[0].element.x;
    const area = chart.chartArea;
    if (!area) return;
    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(138,155,178,0.38)";
    ctx.stroke();
    ctx.restore();
  },
};

export function makePeakPlugin(index, color) {
  return {
    id: "peakMark",
    afterDatasetsDraw(chart) {
      if (index < 0 || !chart.scales.x || !chart.chartArea) return;
      const x = chart.scales.x.getPixelForValue(index);
      const area = chart.chartArea;
      if (!Number.isFinite(x)) return;
      const { ctx } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = withAlpha(color, 0.4);
      ctx.stroke();
      const text = "PEAK";
      ctx.font = "700 9px Inter, system-ui, sans-serif";
      const width = ctx.measureText(text).width + 14;
      const bx = Math.min(Math.max(x - width / 2, area.left + 2), area.right - width - 2);
      const by = area.top + 5;
      ctx.fillStyle = withAlpha(color, 0.16);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, width, 18, 9);
      else ctx.rect(bx, by, width, 18);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + width / 2, by + 9.5);
      ctx.restore();
    },
  };
}

export function centerTextPlugin(lineOne, lineTwo, color, muted) {
  return {
    id: "centerText",
    afterDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;
      const { ctx } = chart;
      const area = chart.chartArea;
      const cx = (area.left + area.right) / 2;
      const cy = (area.top + area.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.font = "700 21px Inter, system-ui, sans-serif";
      ctx.fillText(lineOne, cx, cy - 7);
      ctx.fillStyle = muted;
      ctx.font = "600 9px Inter, system-ui, sans-serif";
      ctx.fillText(lineTwo, cx, cy + 13);
      ctx.restore();
    },
  };
}

export function trendMeta(model, countries) {
  const totals = model.activeMonths.map((mi) =>
    countries.reduce((acc, country) => acc + (country.monthly[mi] || 0), 0)
  );
  let peakIdx = 0;
  let peakVal = -1;
  totals.forEach((value, index) => {
    if (value > peakVal) {
      peakVal = value;
      peakIdx = index;
    }
  });
  const span = model.activeMonths.length;
  return {
    totals,
    peakIdx,
    peakVal,
    avg: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0,
    latest: totals.length ? totals[totals.length - 1] : 0,
    peakLabel: span ? monthLabel(model.activeMonths[peakIdx], span) : "-",
    latestLabel: span ? monthLabel(model.activeMonths[span - 1], span) : "-",
  };
}

export function trendConfig(model, countries, mode, theme) {
  const t = themeColors();
  const span = model.activeMonths.length;
  const meta = trendMeta(model, countries);
  const labels = model.activeMonths.map((mi) => monthLabel(mi, span));
  const datasets = countries.map((country, index) => {
    const color = COUNTRY_COLORS[country.name] || "#1db954";
    const data = model.activeMonths.map((mi) => country.monthly[mi] || 0);
    if (mode === "bar") {
      return {
        label: country.name,
        data,
        backgroundColor: withAlpha(color, 0.74),
        hoverBackgroundColor: color,
        borderWidth: 0,
        borderRadius: 4,
        maxBarThickness: 26,
      };
    }
    let fill = false;
    if (mode === "flow") fill = index === 0 ? "origin" : "-1";
    if (mode === "area") fill = "origin";
    return {
      label: country.name,
      data,
      borderColor: color,
      backgroundColor: withAlpha(color, mode === "flow" ? 0.5 : 0.16),
      fill,
      tension: 0.36,
      borderWidth: mode === "line" ? 2.2 : 1.8,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: t.card,
      pointHoverBorderWidth: 2,
      borderSkipped: false,
    };
  });
  const stacked = mode === "flow" || mode === "bar";
  return {
    type: mode === "bar" ? "bar" : "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)}`,
            footer: (items) =>
              mode === "flow" || mode === "bar"
                ? `Total: ${fmtInt(items.reduce((acc, item) => acc + (item.parsed.y || 0), 0))}`
                : "",
          },
        },
      },
      scales: {
        x: {
          stacked,
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: t.faint,
            font: { size: 9.5 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          stacked,
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: {
            color: t.faint,
            font: { size: 9.5 },
            maxTicksLimit: 5,
            callback: (value) => fmtCompact(value),
          },
        },
      },
    },
    plugins: mode === "bar" ? [crosshairPlugin] : [crosshairPlugin, makePeakPlugin(meta.peakIdx, "#fbbf24")],
    meta,
    theme,
  };
}

export function donutConfig(model, theme, onSlice) {
  const t = themeColors();
  const colors = model.countryList.map((c) => COUNTRY_COLORS[c.name] || "#1db954");
  return {
    type: "doughnut",
    data: {
      labels: model.countryList.map((c) => c.name),
      datasets: [
        {
          data: model.countryList.map((c) => c.streams),
          backgroundColor: colors.map((c) => withAlpha(c, 0.82)),
          hoverBackgroundColor: colors,
          borderColor: t.card,
          borderWidth: 2,
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: {
            label: (ctx) => {
              const country = model.countryList[ctx.dataIndex];
              return ` ${country.name}: ${fmtInt(country.streams)} (${fmtPct(country.share)})`;
            },
          },
        },
      },
      onClick: (_event, elements) => {
        if (elements && elements.length) onSlice(model.countryList[elements[0].index].name);
      },
    },
    plugins: [centerTextPlugin(fmtCompact(model.total), "RECORDED", t.text, t.faint)],
    theme,
  };
}

export function horizontalBarConfig(items, theme, options = {}) {
  const t = themeColors();
  return {
    type: "bar",
    data: {
      labels: items.map((item) => options.label ? options.label(item) : item.name),
      datasets: [
        {
          data: items.map((item) => item.streams),
          backgroundColor: items.map((item) =>
            withAlpha(options.color ? options.color(item) : "#1db954", 0.78)
          ),
          hoverBackgroundColor: items.map((item) =>
            options.color ? options.color(item) : "#1db954"
          ),
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 30,
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
          callbacks: {
            label: (ctx) => ` ${items[ctx.dataIndex]?.name || ""}: ${fmtInt(ctx.parsed.x)}`,
          },
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
          ticks: { color: t.muted, font: { size: 10, weight: "600" } },
        },
      },
      onClick: options.onClick,
    },
    theme,
  };
}

export function monthlyLineConfig(labels, data, color, label, theme) {
  const t = themeColors();
  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.15),
          fill: "origin",
          tension: 0.36,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: t.card,
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: { label: (ctx) => `${label}: ${fmtInt(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.faint, font: { size: 9 }, maxRotation: 0, maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 5, callback: (v) => fmtCompact(v) },
        },
      },
    },
    plugins: [crosshairPlugin],
    theme,
  };
}

export function stackedBarConfig(labels, series, theme) {
  const t = themeColors();
  return {
    type: "bar",
    data: {
      labels,
      datasets: series.map((item) => ({
        label: item.label,
        data: item.data,
        backgroundColor: withAlpha(item.color, 0.78),
        hoverBackgroundColor: item.color,
        borderRadius: 4,
        maxBarThickness: 34,
        borderSkipped: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipStyle(t) },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.muted, font: { size: 10, weight: "600" } },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 5, callback: (v) => fmtCompact(v) },
        },
      },
    },
    theme,
  };
}

export function trendMonthLabels(model) {
  const span = model.activeMonths.length;
  return {
    span,
    labels: model.activeMonths.map((mi) => monthLabel(mi, span)),
  };
}

export function rawMonthLabels() {
  return MONTHS.map((month, index) => MONTH_NAMES[MONTH_OF_YEAR[index]]);
}
