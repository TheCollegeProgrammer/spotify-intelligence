import { Music2 } from "lucide-react";
import { COUNTRY_COLORS } from "../../data/dataset";
import { hashPair, initials, sparkPath, withAlpha } from "../../lib/format";

export function BrandMark({ large = false }) {
  return (
    <span className={`brand-mark${large ? " large" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M7.5 14.5c2.6-1.2 5.6-1.2 8.6.3M6.8 11.2c3.4-1.5 7.3-1.4 10.6.5M6.4 8c3.8-1.7 8.4-1.6 11.9.4" />
      </svg>
    </span>
  );
}

function flagContent(name) {
  if (name === "Brazil") {
    return (
      <>
        <rect width="34" height="24" fill="#009b3a" />
        <path d="M17 3.4 30.6 12 17 20.6 3.4 12Z" fill="#fedf00" />
        <circle cx="17" cy="12" r="4.1" fill="#002776" />
        <path d="M13 11.4c2.5-1 5.4-1 8 .1" stroke="#fff" strokeWidth=".9" fill="none" />
      </>
    );
  }
  if (name === "India") {
    return (
      <>
        <rect width="34" height="8" fill="#ff9933" />
        <rect y="8" width="34" height="8" fill="#fff" />
        <rect y="16" width="34" height="8" fill="#138808" />
        <circle cx="17" cy="12" r="3" fill="none" stroke="#000080" strokeWidth=".8" />
        <circle cx="17" cy="12" r=".8" fill="#000080" />
      </>
    );
  }
  if (name === "Mexico") {
    return (
      <>
        <rect width="11.3" height="24" fill="#006847" />
        <rect x="11.3" width="11.4" height="24" fill="#fff" />
        <rect x="22.7" width="11.3" height="24" fill="#ce1126" />
        <circle cx="17" cy="12" r="2.8" fill="none" stroke="#8b5e34" strokeWidth=".8" />
        <path d="M15.8 12.8c.8-.7 1.6-.7 2.4 0" stroke="#8b5e34" strokeWidth=".6" fill="none" />
      </>
    );
  }
  if (name === "United Kingdom") {
    return (
      <>
        <rect width="34" height="24" fill="#012169" />
        <path d="M0 0l34 24M34 0L0 24" stroke="#fff" strokeWidth="4.4" />
        <path d="M0 0l34 24M34 0L0 24" stroke="#c8102e" strokeWidth="1.8" />
        <path d="M17 0v24M0 12h34" stroke="#fff" strokeWidth="7" />
        <path d="M17 0v24M0 12h34" stroke="#c8102e" strokeWidth="3.6" />
      </>
    );
  }
  const stripes = [];
  for (let i = 0; i < 13; i += 1) {
    stripes.push(
      <rect
        key={`s${i}`}
        y={(i * 24) / 13}
        width="34"
        height={24 / 13 + 0.05}
        fill={i % 2 === 0 ? "#b22234" : "#fff"}
      />
    );
  }
  const stars = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      stars.push(
        <circle key={`${r}-${c}`} cx={2 + c * 3.3} cy={2 + r * 3.3} r=".7" fill="#fff" />
      );
    }
  }
  return (
    <>
      {stripes}
      <rect width="14" height="11.1" fill="#3c3b6e" />
      {stars}
    </>
  );
}

export function Flag({ name }) {
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 34 24">{flagContent(name)}</svg>
    </span>
  );
}

export function Avatar({ name, size = "", className = "" }) {
  const [a, b] = hashPair(name);
  return (
    <span
      className={`avatar ${size} ${className}`.trim()}
      style={{ "--av-a": a, "--av-b": b }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function TrackArt({ trackKey, className = "" }) {
  const [a, b] = hashPair(trackKey);
  return (
    <span
      className={`track-art ${className}`.trim()}
      style={{ "--av-a": a, "--av-b": b }}
      aria-hidden="true"
    >
      <Music2 size={14} />
    </span>
  );
}

export function CountryChip({ name }) {
  return (
    <span className="chip-country">
      <i style={{ background: COUNTRY_COLORS[name] || "#1db954" }} />
      {name}
    </span>
  );
}

export function Sparkline({ values, color = "#1db954" }) {
  const path = sparkPath(values);
  if (!path) return null;
  return (
    <svg className="kpi-spark" viewBox="0 0 90 32" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} fill={withAlpha(color, 0.13)} />
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CountryDist({ streams, total }) {
  const names = Object.keys(COUNTRY_COLORS);
  return (
    <div className="country-dist">
      {names.map((name, index) => {
        const pct = total ? ((streams[index] || 0) / total) * 100 : 0;
        if (!pct) return null;
        return (
          <i
            key={name}
            style={{ width: `${pct}%`, background: COUNTRY_COLORS[name] }}
            title={`${name}: ${pct.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}
