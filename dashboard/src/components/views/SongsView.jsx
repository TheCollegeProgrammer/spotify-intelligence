import { useMemo, useState } from "react";
import { Disc3 } from "lucide-react";
import { REACH_COLORS } from "../../data/dataset";
import {
  centerTextPlugin,
  horizontalBarConfig,
  themeColors,
} from "../../lib/charts";
import {
  fmtCompact,
  fmtInt,
  fmtPct,
  paginate,
  sortRows,
  withAlpha,
} from "../../lib/format";
import { reachDistribution } from "../../lib/model";
import ChartCard from "../ui/ChartCard";
import DataTable, { Pagination, TableToolbar } from "../ui/DataTable";
import { TrackArt } from "../ui/EntityBits";
import { EmptyState, Legend, ViewHead } from "../ui/Primitives";

function reachConfig(model, theme) {
  const t = themeColors();
  const dist = reachDistribution(model);
  const labels = [1, 2, 3, 4, 5].map(
    (reach) => `${reach} market${reach === 1 ? "" : "s"}`
  );
  const values = [1, 2, 3, 4, 5].map((reach) => dist[reach]);
  return {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: REACH_COLORS.map((color) => withAlpha(color, 0.82)),
          hoverBackgroundColor: REACH_COLORS,
          borderColor: t.card,
          borderWidth: 2,
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.isLight ? "#fff" : "#0e1722",
          titleColor: t.text,
          bodyColor: t.muted,
          borderColor: t.border,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${fmtInt(values[ctx.dataIndex])} tracks`,
          },
        },
      },
    },
    plugins: [
      centerTextPlugin(fmtInt(model.tracksList.length), "TRACKS", t.text, t.faint),
    ],
    theme,
  };
}

const COLUMNS = [
  {
    key: "name",
    label: "Track",
    sortable: true,
    render: (track) => (
      <span className="cell-flex">
        <TrackArt trackKey={track.key} />
        <span className="cell-stack">
          <strong>{track.name}</strong>
          <span>{track.artistName}</span>
        </span>
      </span>
    ),
  },
  {
    key: "reach",
    label: "Reach",
    sortable: true,
    className: "num",
    render: (track) => `${track.reach} / 5`,
  },
  {
    key: "streams",
    label: "Recorded values",
    sortable: true,
    className: "num",
    render: (track) => fmtCompact(track.streams),
  },
  {
    key: "share",
    label: "Share",
    sortable: true,
    className: "num muted",
    render: (track) => fmtPct(track.share),
  },
  {
    key: "topCountry",
    label: "Top market",
    sortable: true,
    className: "muted hide-sm",
    render: (track) => track.topCountry,
  },
  {
    key: "avg",
    label: "Monthly avg",
    sortable: true,
    className: "num muted hide-sm",
    render: (track) => fmtCompact(track.avg),
  },
];

const SORTS = [
  ["streams", "Recorded values"],
  ["reach", "Market reach"],
  ["share", "Share"],
  ["name", "Track name"],
];

export default function SongsView({ model, filters, theme, onOpenTrack }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "streams", dir: "desc" });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return model.tracksList.filter(
      (track) =>
        !needle ||
        `${track.name} ${track.artistName}`.toLowerCase().includes(needle)
    );
  }, [model.tracksList, search]);

  const sorted = useMemo(
    () => sortRows(filtered, sort, (track) => track.name),
    [filtered, sort]
  );
  const paged = paginate(sorted, page, size);
  const topTracks = model.tracksList.slice(0, filters.topN);

  const bar = useMemo(
    () =>
      horizontalBarConfig(topTracks, theme, {
        color: () => "#1db954",
        onClick: (_event, elements) => {
          if (elements?.length) onOpenTrack(topTracks[elements[0].index].key);
        },
      }),
    [topTracks, theme, onOpenTrack]
  );

  const reach = useMemo(() => reachConfig(model, theme), [model, theme]);

  const onSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
    setPage(1);
  };

  if (!model.tracksList.length) {
    return (
      <div className="view-root">
        <EmptyState
          title="No tracks in this scope"
          body="No track has recorded values for the selected year, markets, months and search."
        />
      </div>
    );
  }

  return (
    <div className="view-root">
      <ViewHead
        eyebrow="Track intelligence"
        icon={Disc3}
        title="873 tracks across five recorded markets"
        subtitle="Reach counts markets where a track appears. Broad-reach tracks are the exception, not the norm."
        actions={
          <span className="badge neutral">
            {fmtInt(model.tracksList.length)} tracks in scope
          </span>
        }
      />

      <div className="grid">
        <ChartCard
          title="Top tracks by recorded values"
          subtitle="Tracks ranked by values in the current scope."
          config={bar}
          span="span-7"
          chartClassName="tall"
          chartLabel="Top tracks by recorded values"
          caption="Click a bar to open the track profile."
        />
        <ChartCard
          title="Reach distribution"
          subtitle="How many markets each track appears in."
          config={reach}
          span="span-5"
          chartClassName="tall"
          chartLabel="Track reach distribution"
          after={
            <Legend
              items={[1, 2, 3, 4, 5].map((n, index) => ({
                label: `${n} market${n === 1 ? "" : "s"}`,
                color: REACH_COLORS[index],
              }))}
            />
          }
          caption="Only one track appears in all five markets; 761 of 873 appear in a single market."
        />

        <div className="card span-12">
          <div className="card-head">
            <div>
              <h2>Track leaderboard</h2>
              <p>Search, sort and open any track profile.</p>
            </div>
            <span className="card-tag">Top {fmtInt(filtered.length)}</span>
          </div>
          <div className="table-toolbar" style={{ marginBottom: 10 }}>
            <TableToolbar
              search={search}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search tracks or artists"
            />
            <TableToolbar
              value={sort.key}
              onValueChange={(value) => {
                setSort((current) => ({ ...current, key: value }));
                setPage(1);
              }}
              label="Sort tracks"
              options={SORTS.map(([value, label]) => ({ value, label: `Sort: ${label}` }))}
            />
          </div>
          <DataTable
            columns={COLUMNS}
            rows={paged.rows}
            rowKey={(track) => track.key}
            sort={sort}
            onSort={onSort}
            onRowClick={(track) => onOpenTrack(track.key)}
            empty="No tracks match this search."
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
            noun="tracks"
          />
        </div>
      </div>
    </div>
  );
}
