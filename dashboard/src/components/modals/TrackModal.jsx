import { useMemo } from "react";
import { ArrowRight, Users } from "lucide-react";
import { COUNTRIES, COUNTRY_COLORS } from "../../data/dataset";
import { monthlyLineConfig } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, monthLabel } from "../../lib/format";
import { CountryChip, TrackArt } from "../ui/EntityBits";
import { ModalShell } from "../ui/Primitives";
import ChartCanvas from "../ui/ChartCanvas";

function Kpi({ label, value }) {
  return (
    <div className="modal-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function TrackModal({
  trackKey,
  model,
  theme,
  onClose,
  onFilterTrack,
  onOpenArtist,
}) {
  const track = model.trackAgg.get(trackKey);
  const chart = useMemo(() => {
    if (!track) return null;
    const labels = model.activeMonths.map((mi) =>
      monthLabel(mi, model.activeMonths.length)
    );
    const data = model.activeMonths.map((mi) => track.monthly.get(mi) || 0);
    return monthlyLineConfig(labels, data, "#1db954", track.name, theme);
  }, [track, model, theme]);

  if (!track) {
    return (
      <ModalShell title="Track not found" onClose={onClose}>
        <p className="muted">This track has no recorded values in the current scope.</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Track profile"
      subtitle={`${track.name} · ${track.artistName}`}
      size="wide"
      onClose={onClose}
      headExtra={
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            onFilterTrack(track.name);
            onClose();
          }}
        >
          Filter dashboard <ArrowRight size={14} />
        </button>
      }
    >
      <div className="modal-profile">
        <TrackArt trackKey={track.key} className="lg" />
        <div>
          <h3>{track.name}</h3>
          <p>
            {track.artistName} · {track.reach} of 5 markets · {fmtPct(track.share)} of scope
          </p>
        </div>
      </div>

      <div className="modal-kpis">
        <Kpi label="Recorded values" value={fmtCompact(track.streams)} />
        <Kpi label="Markets" value={`${track.reach} / 5`} />
        <Kpi label="Share" value={fmtPct(track.share)} />
        <Kpi label="Monthly avg" value={fmtCompact(track.avg)} />
      </div>

      <div className="modal-section">
        <h4>Monthly recorded values</h4>
        <div className="chart-wrap tall">
          <ChartCanvas config={chart} ariaLabel={`${track.name} monthly recorded values`} />
        </div>
      </div>

      <div className="modal-grid modal-section">
        <div>
          <h4>Market split</h4>
          <div className="split-list">
            {COUNTRIES.map((name, index) => {
              const value = track.countryStreams[index] || 0;
              if (!value) return null;
              return (
                <div className="split-row" key={name}>
                  <span><CountryChip name={name} /></span>
                  <strong>
                    {fmtCompact(value)}{" "}
                    <span className="faint">
                      ({fmtPct(track.streams ? (value / track.streams) * 100 : 0)})
                    </span>
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h4>Availability</h4>
          <div className="split-list">
            <div className="split-row">
              <span>Artist</span>
              <button
                className="link-btn"
                type="button"
                onClick={() => {
                  onOpenArtist(track.ai);
                  onClose();
                }}
              >
                {track.artistName} <Users size={12} />
              </button>
            </div>
            <div className="split-row">
              <span>Top market</span>
              <strong>{track.topCountry || "-"}</strong>
            </div>
            <div className="split-row">
              <span>Months present</span>
              <strong>{fmtInt(track.months.size)}</strong>
            </div>
            <div className="split-row">
              <span>Markets reached</span>
              <strong>{track.reach} of 5</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-section">
        <h4>Reach interpretation</h4>
        <div className="card-caption">
          {track.reach === 1
            ? "This track appears in one market only. Most of the catalogue shares this pattern."
            : `This track appears in ${track.reach} markets. Broad reach is rare: only one track reaches all five.`}
        </div>
      </div>

      <div className="card-caption">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            className="donut-dot"
            style={{ background: COUNTRY_COLORS[track.topCountry] || "#1db954", width: 7, height: 7 }}
          />
          Top market share: {fmtPct(track.streams ? ((track.countryStreams[COUNTRIES.indexOf(track.topCountry)] || 0) / track.streams) * 100 : 0)}
        </span>
      </div>
    </ModalShell>
  );
}
