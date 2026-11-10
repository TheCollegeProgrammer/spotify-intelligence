import { useMemo } from "react";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { COUNTRY_COLORS } from "../../data/dataset";
import { monthlyLineConfig } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, monthLabel } from "../../lib/format";
import { Flag } from "../ui/EntityBits";
import { ModalShell } from "../ui/Primitives";
import ChartCanvas from "../ui/ChartCanvas";

function ModalKpi({ label, value, sub }) {
  return (
    <div className="modal-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <em>{sub}</em>}
    </div>
  );
}

function LeaderList({ items, empty, renderSub }) {
  if (!items.length) return <div className="empty-inline">{empty}</div>;
  return (
    <div className="split-list">
      {items.slice(0, 6).map((item, index) => (
        <div className="split-row" key={item.key || item.ai}>
          <span>
            <span className="rank-no">{index + 1}</span> {item.name}
            <span className="faint"> · {renderSub(item)}</span>
          </span>
          <strong>{fmtCompact(item.streams)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function CountryModal({
  name,
  baseModel,
  theme,
  onClose,
  onIsolate,
  onCompare,
  onNavigate,
}) {
  const country = baseModel.countryList.find((item) => item.name === name);
  const chart = useMemo(() => {
    if (!country) return null;
    const labels = baseModel.activeMonths.map((mi) =>
      monthLabel(mi, baseModel.activeMonths.length)
    );
    const data = baseModel.activeMonths.map((mi) => country.monthly[mi] || 0);
    return monthlyLineConfig(labels, data, COUNTRY_COLORS[country.name], country.name, theme);
  }, [baseModel, country, theme]);

  if (!country) {
    return (
      <ModalShell title="Market not found" onClose={onClose}>
        <p className="muted">This market has no data in the current scope.</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Market profile"
      subtitle={`${country.name} · ${fmtPct(country.share)} of recorded values in scope`}
      size="wide"
      onClose={onClose}
      headExtra={
        <button
          className="btn"
          type="button"
          onClick={() => {
            onCompare(country.name);
            onClose();
          }}
        >
          <GitCompareArrows size={14} />
          Compare
        </button>
      }
    >
      <div className="modal-profile">
        <Flag name={country.name} />
        <div>
          <h3>{country.name}</h3>
          <p>
            Rank #{baseModel.countryList.indexOf(country) + 1} ·{" "}
            {fmtInt(country.trackCount)} tracks · {fmtInt(country.artistCount)} artists
          </p>
        </div>
        <div className="spacer" />
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            onIsolate(country.name);
            onClose();
          }}
        >
          Filter dashboard <ArrowRight size={14} />
        </button>
      </div>

      <div className="modal-kpis">
        <ModalKpi label="Recorded values" value={fmtCompact(country.streams)} />
        <ModalKpi label="Share" value={fmtPct(country.share)} />
        <ModalKpi label="Tracks" value={fmtInt(country.trackCount)} />
        <ModalKpi label="Artists" value={fmtInt(country.artistCount)} />
      </div>

      <div className="modal-section">
        <h4>Monthly recorded values</h4>
        <div className="chart-wrap tall">
          <ChartCanvas
            config={chart}
            className=""
            ariaLabel={`${country.name} monthly recorded values`}
          />
        </div>
      </div>

      <div className="modal-grid modal-section">
        <div>
          <h4>Top artists in market</h4>
          <LeaderList
            items={country.artists}
            empty="No artists in this market scope."
            renderSub={(item) => `${fmtInt(item.trackKeys.size)} tracks`}
          />
        </div>
        <div>
          <h4>Top tracks in market</h4>
          <LeaderList
            items={country.tracks}
            empty="No tracks in this market scope."
            renderSub={(item) => `${item.artistName} · ${fmtPct(item.share)} of market`}
          />
        </div>
      </div>

      <div className="modal-section">
        <h4>Market leaders</h4>
        <div className="split-list">
          <div className="split-row">
            <span>Top artist</span>
            <strong>{country.topArtist ? country.topArtist.name : "-"}</strong>
          </div>
          <div className="split-row">
            <span>Top track</span>
            <strong>
              {country.topTrack ? `${country.topTrack.name} · ${country.topTrack.artistName}` : "-"}
            </strong>
          </div>
        </div>
      </div>

      <div className="card-caption">
        <button className="link-btn" type="button" onClick={() => onNavigate("countries")}>
          Open market comparison <ArrowRight size={12} />
        </button>
      </div>
    </ModalShell>
  );
}
