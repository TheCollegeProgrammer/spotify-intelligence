import { useMemo, useState } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { paginate, sortRows } from "../../lib/format";
import { fmtCompact, fmtInt, fmtPct } from "../../lib/format";
import { Avatar, CountryDist } from "../ui/EntityBits";
import DataTable, { Pagination, TableToolbar } from "../ui/DataTable";
import { EmptyState, ViewHead } from "../ui/Primitives";

function ArtistCard({ artist, onOpen }) {
  return (
    <article className="entity-card">
      <div className="entity-top">
        <Avatar name={artist.name} size="lg" />
        <button
          className="card-tool"
          type="button"
          onClick={() => onOpen(artist.ai)}
          title="Open artist profile"
          aria-label="Open artist profile"
        >
          <ArrowUpRight size={13} />
        </button>
      </div>
      <h3 title={artist.name}>{artist.name}</h3>
      <div className="entity-sub">
        {artist.topTrack ? artist.topTrack.name : "No track in scope"}
      </div>
      <div className="entity-stats">
        <div>
          <strong>{fmtCompact(artist.streams)}</strong>
          <span>Values</span>
        </div>
        <div>
          <strong>{fmtInt(artist.trackCount)}</strong>
          <span>Tracks</span>
        </div>
        <div>
          <strong>{artist.marketCount}</strong>
          <span>Markets</span>
        </div>
      </div>
      <CountryDist streams={artist.countryStreams} total={artist.streams} />
      <div className="entity-actions">
        <span className="badge">{fmtPct(artist.share)} share</span>
        <span className="entity-top-track">{artist.topTrack ? artist.topTrack.name : ""}</span>
      </div>
    </article>
  );
}

const COLUMNS = [
  {
    key: "name",
    label: "Artist",
    sortable: true,
    render: (artist) => (
      <span className="cell-flex">
        <Avatar name={artist.name} />
        <span className="cell-stack">
          <strong>{artist.name}</strong>
          <span>{artist.topTrack ? artist.topTrack.name : "No track in scope"}</span>
        </span>
      </span>
    ),
  },
  {
    key: "trackCount",
    label: "Tracks",
    sortable: true,
    className: "num",
    render: (artist) => fmtInt(artist.trackCount),
  },
  {
    key: "marketCount",
    label: "Markets",
    sortable: true,
    className: "num",
    render: (artist) => artist.marketCount,
  },
  {
    key: "streams",
    label: "Recorded values",
    sortable: true,
    className: "num",
    render: (artist) => fmtCompact(artist.streams),
  },
  {
    key: "share",
    label: "Share",
    sortable: true,
    className: "num muted",
    render: (artist) => fmtPct(artist.share),
  },
  {
    key: "avg",
    label: "Monthly avg",
    sortable: true,
    className: "num muted hide-sm",
    render: (artist) => fmtCompact(artist.avg),
  },
];

const SORTS = [
  ["streams", "Recorded values"],
  ["trackCount", "Track count"],
  ["marketCount", "Market reach"],
  ["name", "Artist name"],
];

export default function ArtistsView({ model, onOpenArtist }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "streams", dir: "desc" });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return model.artistsList.filter(
      (artist) => !needle || artist.name.toLowerCase().includes(needle)
    );
  }, [model.artistsList, search]);

  const sorted = useMemo(
    () => sortRows(filtered, sort, (artist) => artist.name),
    [filtered, sort]
  );
  const paged = paginate(sorted, page, size);

  const onSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
    setPage(1);
  };

  if (!model.artistsList.length) {
    return (
      <div className="view-root">
        <EmptyState
          title="No artists in this scope"
          body="No artist has recorded values for the selected year, markets, months and search."
        />
      </div>
    );
  }

  return (
    <div className="view-root">
      <ViewHead
        eyebrow="Artist intelligence"
        icon={Users}
        title="Catalogue depth across 454 artists"
        subtitle="Top artists are ranked by recorded values. Reach shows how many of the five markets carry each artist."
        actions={
          <span className="badge neutral">
            {fmtInt(model.artistsList.length)} artists in scope
          </span>
        }
      />

      <div className="entity-toolbar">
        <span className="grow">
          <TableToolbar
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search artists"
          />
        </span>
        <TableToolbar
          value={sort.key}
          onValueChange={(value) => {
            setSort((current) => ({ ...current, key: value }));
            setPage(1);
          }}
          label="Sort artists"
          options={SORTS.map(([value, label]) => ({ value, label: `Sort: ${label}` }))}
        />
      </div>

      <div className="entity-grid">
        {model.artistsList.slice(0, 6).map((artist) => (
          <ArtistCard key={artist.ai} artist={artist} onOpen={onOpenArtist} />
        ))}
      </div>

      <div className="card span-12" style={{ marginTop: 14 }}>
        <div className="card-head">
          <div>
            <h2>Artist leaderboard</h2>
            <p>Search, sort and open any artist profile.</p>
          </div>
          <span className="card-tag">Top {fmtInt(filtered.length)}</span>
        </div>
        <DataTable
          columns={COLUMNS}
          rows={paged.rows}
          rowKey={(artist) => artist.ai}
          sort={sort}
          onSort={onSort}
          onRowClick={(artist) => onOpenArtist(artist.ai)}
          empty="No artists match this search."
        />
        <Pagination
          page={paged.page}
          pages={paged.pages}
          total={sorted.length}
          size={size}
          onPage={setPage}
          onSize={(value) => {
            setSize(value);
            setPage(1);
          }}
          noun="artists"
        />
      </div>
    </div>
  );
}
