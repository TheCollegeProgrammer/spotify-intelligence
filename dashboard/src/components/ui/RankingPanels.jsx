import { fmtCompact, fmtInt, fmtPct } from "../../lib/format";
import { Avatar, Flag, TrackArt } from "./EntityBits";

export function RankList({
  items,
  kind,
  limit = 10,
  onOpen,
  empty = "No results in the current scope.",
}) {
  const visible = items.slice(0, limit);
  const max = visible.length ? visible[0].streams || 1 : 1;

  if (!visible.length) {
    return <div className="empty-inline">{empty}</div>;
  }

  return (
    <div className="rank-list">
      {visible.map((item, index) => {
        const isArtist = kind === "artist";
        const key = isArtist ? item.ai : item.key;
        const sub = isArtist
          ? `${item.trackCount} track${item.trackCount === 1 ? "" : "s"} · ${item.marketCount} market${item.marketCount === 1 ? "" : "s"}`
          : `${item.artistName} · ${item.reach} market${item.reach === 1 ? "" : "s"}`;
        return (
          <button
            className="rank-row"
            key={`${kind}-${key}`}
            type="button"
            onClick={() => onOpen && onOpen(isArtist ? item.ai : item.key)}
          >
            <span className="rank-no">{index + 1}</span>
            {isArtist ? <Avatar name={item.name} /> : <TrackArt trackKey={item.key} />}
            <span className="rank-main">
              <strong title={item.name}>{item.name}</strong>
              <span>{sub}</span>
              <span className="rank-bar">
                <i style={{ width: `${Math.max(4, (item.streams / max) * 100)}%` }} />
              </span>
            </span>
            <span className="rank-right">
              <strong>{fmtCompact(item.streams)}</strong>
              <span>{fmtPct(item.share)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MarketTable({ countries, onOpen }) {
  return (
    <div className="table-wrap short">
      <table className="data-table clickable">
        <thead>
          <tr>
            <th>#</th>
            <th>Market</th>
            <th className="num">Recorded values</th>
            <th className="num">Share</th>
            <th className="hide-sm">Top artist</th>
            <th className="hide-sm">Top track</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country, index) => (
            <tr
              key={country.name}
              onClick={() => onOpen && onOpen(country.name)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (onOpen) onOpen(country.name);
                }
              }}
            >
              <td>
                <span className={`rank${index === 0 ? " top" : ""}`}>{index + 1}</span>
              </td>
              <td>
                <span className="cell-flex">
                  <Flag name={country.name} />
                  <strong>{country.name}</strong>
                </span>
              </td>
              <td className="num">{fmtCompact(country.streams)}</td>
              <td className="num muted">{fmtPct(country.share)}</td>
              <td className="hide-sm muted">
                {country.topArtist ? country.topArtist.name : "-"}
              </td>
              <td className="hide-sm">
                <span className="track-name">
                  {country.topTrack ? country.topTrack.name : "-"}
                </span>
                <span className="sub-name">
                  {country.topTrack ? country.topTrack.artistName : ""}
                </span>
              </td>
            </tr>
          ))}
          {!countries.length && (
            <tr>
              <td colSpan="6" className="empty-cell">
                No markets match the current scope.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RankLegend({ items }) {
  return (
    <div className="legend-inline">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
          <strong>{fmtInt(item.value)}</strong>
        </span>
      ))}
    </div>
  );
}
