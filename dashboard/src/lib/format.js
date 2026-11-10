import { MONTH_NAMES, MONTHS, MONTH_OF_YEAR } from "../data/dataset";

export function fmtInt(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

export function fmtCompact(n) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);
}

export function fmtPct(n) {
  return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1) + "%";
}

export function truncate(value, max) {
  const text = String(value ?? "");
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

export function withAlpha(hex, alpha) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const num = parseInt(h, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function monthLabel(monthIndex, span) {
  const m = MONTH_OF_YEAR[monthIndex];
  const y = MONTHS[monthIndex].slice(2, 4);
  return span > 12 ? `${MONTH_NAMES[m]} '${y}` : MONTH_NAMES[m];
}

export function initials(name) {
  const parts = String(name)
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  ["#1db954", "#22d3ee"],
  ["#22d3ee", "#60a5fa"],
  ["#a78bfa", "#f472b6"],
  ["#fbbf24", "#f472b6"],
  ["#34d399", "#a78bfa"],
  ["#60a5fa", "#34d399"],
  ["#f472b6", "#fbbf24"],
  ["#1db954", "#60a5fa"],
];

export function hashPair(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function sparkPath(values, width = 90, height = 32, padding = 3) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const points = nums.map((v, i) => [
    padding + (i * (width - padding * 2)) / (nums.length - 1),
    height - padding - ((v - min) / span) * (height - padding * 2),
  ]);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last[0].toFixed(1)} ${height} L${first[0].toFixed(1)} ${height} Z`;
  return { line, area };
}

export function sortRows(rows, sort, nameFn) {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sort.key === "name" ? nameFn(a) : a[sort.key];
    const bv = sort.key === "name" ? nameFn(b) : b[sort.key];
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * dir;
    }
    return ((av || 0) - (bv || 0)) * dir;
  });
}

export function paginate(list, page, size) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const safePage = Math.min(Math.max(1, page), pages);
  return {
    page: safePage,
    pages,
    start: (safePage - 1) * size,
    rows: list.slice((safePage - 1) * size, safePage * size),
  };
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
