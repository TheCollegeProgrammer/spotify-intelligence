import { useMemo } from "react";
import { ArrowRight, Disc3 } from "lucide-react";
import { COUNTRIES, COUNTRY_COLORS } from "../../data/dataset";
import { monthlyLineConfig } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, monthLabel } from "../../lib/format";
import { Avatar, CountryChip } from "../ui/EntityBits";
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

export default function ArtistModal({
  artistIndex,
  model,
  theme,
  onClose,
  onFilterArtist,
  onOpenTrack,
}) {
  const artist = model.artistAgg.get(Number(artistIndex));
  const tracks = useMemo(() => {
    if (!artist) return [];
    return [...artist.trackKeys]
      .map((key) => model.trackAgg.get(key))
      .filter(Boolean)
      .sort((a, b) => b.streams - a.streams);
  }, [artist, model]);

  const chart = useMemo(() => {
    if (!artist) return null;
    const labels = model.activeMonths.map((mi) =>
      monthLabel(mi, model.activeMonths.length)
    );
    const data = model.activeMonths.map((mi) => artist.monthly.get(mi) || 0);
    return monthlyLineConfig(labels, data, "#a78bfa", artist.name, theme);
  }, [artist, model, theme]);

  if (!artist) {
    return (
      <ModalShell title="Artist not found" onClose={onClose}>
        <p className="muted">This artist has no recorded values in the current scope.</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Artist profile"
      subtitle={`${artist.name} · ${fmtPct(artist.share)} of recorded values in scope`}
      size="wide"
      onClose={onClose}
      headExtra={
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            onFilterArtist(artist.name);
            onClose();
          }}
        >
          Filter dashboard <ArrowRight size={14} />
        </button>
      }
    >
      <div className="modal-profile">
        <Avatar name={artist.name} size="lg" />
        <div>
          <h3>{artist.name}</h3>
          <p>
            {fmtInt(artist.trackCount)} tracks · {artist.marketCount} markets ·{" "}
            {fmtCompact(artist.streams)} recorded values
          </p>
        </div>
      </div>

      <div className="modal-kpis">
        <Kpi label="Recorded values" value={fmtCompact(artist.streams)} />
        <Kpi label="Tracks" value={fmtInt(artist.trackCount)} />
        <Kpi label="Markets" value={`${artist.marketCount} / 5`} />
        <Kpi label="Monthly avg" value={fmtCompact(artist.avg)} />
      </div>

      <div className="modal-section">
        <h4>Monthly recorded values</h4>
        <div className="chart-wrap tall">
          <ChartCanvas config={chart} ariaLabel={`${artist.name} monthly recorded values`} />
        </div>
      </div>

      <div className="modal-grid modal-section">
        <div>
          <h4>Market distribution</h4>
          <div className="split-list">
            {COUNTRIES.map((name, index) => {
              const value = artist.countryStreams[index] || 0;
              if (!value) return null;
              return (
                <div className="split-row" key={name}>
                  <span><CountryChip name={name} /></span>
                  <strong>
                    {fmtCompact(value)}{" "}
                    <span className="faint">
                      ({fmtPct(artist.streams ? (value / artist.streams) * 100 : 0)})
                    </span>
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h4>Top tracks</h4>
          <div className="split-list">
            {tracks.slice(0, 7).map((track) => (
              <button
                className="split-row clickable-row"
                key={track.key}
                type="button"
                onClick={() => {
                  onOpenTrack(track.key);
                  onClose();
                }}
              >
                <span>
                  <Disc3 size={12} /> {track.name}
                </span>
                <strong>{fmtCompact(track.streams)}</strong>
              </button>
            ))}
            {!tracks.length && <div className="empty-inline">No tracks in this scope.</div>}
          </div>
        </div>
      </div>

      <div className="modal-section">
        <h4>Best market</h4>
        <div className="split-list">
          <div className="split-row">
            <span>Top track</span>
            <strong>{artist.topTrack ? artist.topTrack.name : "-"}</strong>
          </div>
          <div className="split-row">
            <span>Markets reached</span>
            <strong>{artist.marketCount} of 5</strong>
          </div>
        </div>
      </div>

      <div className="card-caption">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            className="donut-dot"
            style={{ background: COUNTRY_COLORS[COUNTRIES[0]], width: 7, height: 7 }}
          />
          Market values are drawn from the current filtered scope.
        </span>
      </div>
    </ModalShell>
  );
}
