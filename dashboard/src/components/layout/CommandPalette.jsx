import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Globe2,
  LayoutDashboard,
  Moon,
  Music2,
  RotateCcw,
  Search,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";
import { COUNTRIES } from "../../data/dataset";
import { fmtCompact } from "../../lib/format";

const VIEW_ICONS = {
  overview: LayoutDashboard,
  countries: Globe2,
  artists: Users,
  songs: Music2,
  insights: TrendingUp,
};

function buildItems({
  navigate,
  model,
  theme,
  onReset,
  onExport,
  onTheme,
  onIsolate,
  onArtist,
  onTrack,
  onClose,
}) {
  const items = [
    {
      group: "Navigate",
      label: "Overview",
      sub: "Executive dashboard",
      icon: LayoutDashboard,
      run: () => navigate("overview"),
    },
    {
      group: "Navigate",
      label: "Countries",
      sub: "Market comparison and overlap",
      icon: Globe2,
      run: () => navigate("countries"),
    },
    {
      group: "Navigate",
      label: "Artists",
      sub: "Artist intelligence",
      icon: Users,
      run: () => navigate("artists"),
    },
    {
      group: "Navigate",
      label: "Songs",
      sub: "Track intelligence",
      icon: Music2,
      run: () => navigate("songs"),
    },
    {
      group: "Navigate",
      label: "Growth & Insights",
      sub: "Dataset capability boundaries",
      icon: TrendingUp,
      run: () => navigate("insights"),
    },
    {
      group: "Actions",
      label: "Reset all filters",
      sub: "Return to the full dataset",
      icon: RotateCcw,
      run: onReset,
    },
    {
      group: "Actions",
      label: "Export filtered CSV",
      sub: "Download the current scope",
      icon: Download,
      run: onExport,
    },
    {
      group: "Actions",
      label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      sub: "Change the workspace appearance",
      icon: theme === "dark" ? Moon : Sun,
      run: onTheme,
    },
  ];

  COUNTRIES.forEach((country) => {
    const match = model?.countryList.find((item) => item.name === country);
    items.push({
      group: "Markets",
      label: country,
      sub: match
        ? `${fmtCompact(match.streams)} · ${match.share.toFixed(1)}% of scope`
        : "No data in scope",
      icon: Globe2,
      run: () => {
        onIsolate(country);
        navigate("countries");
      },
    });
  });

  (model?.artistsList || []).slice(0, 24).forEach((artist) => {
    items.push({
      group: "Artists",
      label: artist.name,
      sub: `${fmtCompact(artist.streams)} · ${artist.trackCount} tracks`,
      icon: Users,
      run: () => {
        onArtist(artist.name);
        navigate("artists");
      },
    });
  });

  (model?.tracksList || []).slice(0, 24).forEach((track) => {
    items.push({
      group: "Tracks",
      label: track.name,
      sub: `${track.artistName} · ${track.reach} markets`,
      icon: Music2,
      run: () => {
        onTrack(track.name);
        navigate("songs");
      },
    });
  });

  return items.map((item) => ({
    ...item,
    run: () => {
      item.run();
      onClose();
    },
  }));
}

export default function CommandPalette(props) {
  const { open, onClose, model, theme } = props;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(
    () => (open ? buildItems(props) : []),
    [open, model, theme, props]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 34);
    return items
      .filter((item) =>
        `${item.label} ${item.sub} ${item.group}`.toLowerCase().includes(needle)
      )
      .slice(0, 34);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  let group = "";
  const select = (item) => {
    if (item) item.run();
  };

  return (
    <div
      className="command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="command" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="command-input">
          <Search size={16} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search artists, tracks, markets, views or actions..."
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(filtered.length - 1, value + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                select(filtered[active]);
              }
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results" ref={listRef}>
          {filtered.map((item, index) => {
            const Icon = item.icon || Search;
            const showGroup = item.group !== group;
            group = item.group;
            return (
              <div key={`${item.group}-${item.label}-${index}`}>
                {showGroup && <div className="command-group">{item.group}</div>}
                <button
                  type="button"
                  className={`command-item${index === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => select(item)}
                >
                  <span className="command-ico">
                    <Icon size={15} />
                  </span>
                  <span className="command-main">
                    <strong>{item.label}</strong>
                    <span>{item.sub}</span>
                  </span>
                  <span className="command-go">↵</span>
                </button>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="command-empty">No matching commands or records.</div>
          )}
        </div>
        <div className="command-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>^</kbd><kbd>K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
