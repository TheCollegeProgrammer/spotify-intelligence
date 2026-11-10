import {
  ArrowUpRight,
  Database,
  Globe2,
  LayoutDashboard,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandMark } from "../ui/EntityBits";
import { NAV_ITEMS } from "../../data/dataset";
import { fmtInt } from "../../lib/format";

const ICONS = {
  overview: LayoutDashboard,
  countries: Globe2,
  artists: Users,
  songs: Music2,
  insights: TrendingUp,
  quality: Database,
};

export default function Sidebar({
  view,
  navigate,
  collapsed,
  onToggle,
  stats,
  onCloseMobile,
}) {
  let lastSection = "";

  return (
    <aside className="sidebar" id="sidebar" aria-label="Primary navigation">
      <div className="sidebar-top">
        <a
          className="brand"
          href="#/overview"
          aria-label="Spotify Intelligence home"
          onClick={(event) => {
            event.preventDefault();
            navigate("overview");
            onCloseMobile();
          }}
        >
          <BrandMark />
          <span className="brand-text">
            <strong>
              Spotify <em>Intelligence</em>
            </strong>
            <small>Global Streaming Intelligence</small>
          </span>
        </a>
        <button
          className="icon-btn ghost sidebar-collapse"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="nav" id="nav" aria-label="Workspace">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section !== lastSection;
          lastSection = item.section;
          const Icon = ICONS[item.view] || LayoutDashboard;
          return (
            <div key={item.view} className="nav-group">
              {showSection && <span className="nav-section">{item.section}</span>}
              <button
                className={`nav-item${view === item.view ? " active" : ""}`}
                type="button"
                data-view={item.view}
                data-tooltip={item.label}
                onClick={() => {
                  navigate(item.view);
                  onCloseMobile();
                }}
              >
                <span className="nav-ico">
                  <Icon size={18} />
                </span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-dot" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-health" id="sidebarHealth">
        <div className="health-head">
          <span className="health-dot" />
          <span>Dataset health</span>
          <strong>Stable</strong>
        </div>
        <p>
          {fmtInt(stats?.rows || 0)} records verified. No nulls, no duplicate keys.
        </p>
        <div className="health-bar">
          <i style={{ width: "100%" }} />
        </div>
        <button
          className="health-link"
          type="button"
          onClick={() => {
            navigate("quality");
            onCloseMobile();
          }}
        >
          Inspect data quality <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="sidebar-foot">
        <span className="foot-source">Source · kworb.net</span>
        <span className="foot-meta">5 markets · 36 months</span>
        <span className="foot-version">Demo dataset · v2.0</span>
      </div>
    </aside>
  );
}
