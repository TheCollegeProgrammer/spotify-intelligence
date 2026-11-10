import {
  Activity,
  Disc3,
  Globe2,
  MapPin,
  Music2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { fmtInt, withAlpha } from "../../lib/format";
import { Sparkline } from "./EntityBits";

const ICONS = {
  activity: Activity,
  globe: Globe2,
  users: Users,
  music: Music2,
  map: MapPin,
  disc: Disc3,
};

export function CoverageStrip({ items, note = "Demo dataset · mirrored source values" }) {
  return (
    <div className="coverage-strip">
      {items.map((item) => (
        <div className="coverage-item" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
      <div className="coverage-note">
        <TriangleAlert size={13} />
        {note}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color = "#1db954", spark, text, title }) {
  const Icon = typeof icon === "string" ? ICONS[icon] : icon;
  return (
    <div
      className="kpi"
      style={{ "--kpi-color": color, "--kpi-bg": withAlpha(color, 0.13) }}
    >
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">
          {Icon ? <Icon size={15} /> : <Activity size={15} />}
        </span>
      </div>
      <div
        className={`kpi-value${text ? " text" : ""}`}
        title={title || undefined}
      >
        {value}
      </div>
      <div className="kpi-sub">{sub}</div>
      {spark && <Sparkline values={spark} color={color} />}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="kpi skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
    </div>
  );
}

export default function KpiGrid({ items, loading = false }) {
  if (loading) {
    return (
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    );
  }
  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function buildOverviewKpis(model) {
  const topCountry = model.countryList[0];
  const topArtist = model.artistsList[0];
  const topTrack = model.tracksList[0];
  return [
    {
      label: "Recorded values",
      value: new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(model.total || 0),
      sub: "Monthly source values in current scope",
      icon: "activity",
      color: "#1db954",
      spark: model.activeMonths.map((mi) => model.monthTotals[mi]),
    },
    {
      label: "Top market",
      value: topCountry ? topCountry.name : "-",
      sub: topCountry
        ? `${topCountry.share.toFixed(1)}% of recorded values`
        : "No data",
      icon: "globe",
      color: "#22d3ee",
      text: true,
      title: topCountry ? topCountry.name : "",
    },
    {
      label: "Top artist",
      value: topArtist ? topArtist.name : "-",
      sub: topArtist
        ? `${fmtInt(topArtist.streams)} · ${topArtist.share.toFixed(1)}%`
        : "No data",
      icon: "users",
      color: "#a78bfa",
      text: true,
      title: topArtist ? topArtist.name : "",
    },
    {
      label: "Top track",
      value: topTrack ? topTrack.name : "-",
      sub: topTrack
        ? `${topTrack.artistName} · ${topTrack.reach} market${topTrack.reach === 1 ? "" : "s"}`
        : "No data",
      icon: "music",
      color: "#fbbf24",
      text: true,
      title: topTrack ? topTrack.name : "",
    },
    {
      label: "Active markets",
      value: String(model.countryList.length),
      sub: "Markets represented in scope",
      icon: "map",
      color: "#60a5fa",
    },
    {
      label: "Distinct tracks",
      value: fmtInt(model.tracksList.length),
      sub: `${fmtInt(model.artistsList.length)} distinct artists`,
      icon: "disc",
      color: "#f472b6",
    },
  ];
}
