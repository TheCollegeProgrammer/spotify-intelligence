import {
  Download,
  Layers,
  Menu,
  Moon,
  PanelLeftOpen,
  Search,
  Sun,
} from "lucide-react";
import { fmtInt } from "../../lib/format";

export default function Topbar({
  meta,
  theme,
  rowCount,
  marketCount,
  collapsed,
  onMenu,
  onCommand,
  onExport,
  onTheme,
  onExpandSidebar,
}) {
  const isDark = theme === "dark";
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn mobile-menu"
          type="button"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        {collapsed && (
          <button
            className="icon-btn desktop-sidebar-open"
            type="button"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            onClick={onExpandSidebar}
          >
            <PanelLeftOpen size={17} />
          </button>
        )}
        <div className="page-heading">
          <div className="crumb">
            Spotify Intelligence <span>/</span> <strong>{meta.crumb}</strong>
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          className="status-pill"
          type="button"
          title="Dataset status"
          onClick={onCommand}
        >
          <span className="status-dot" />
          <span>Demo dataset</span>
        </button>
        <button
          className="coverage-pill"
          type="button"
          title="Data coverage"
          onClick={() => onCommand("coverage")}
        >
          <Layers size={14} />
          <span>{fmtInt(rowCount)} rows</span>
          <span className="coverage-divider" />
          <span>{marketCount} markets</span>
        </button>
        <button
          className="icon-btn"
          type="button"
          title="Search and commands (Ctrl K)"
          aria-label="Search and commands"
          onClick={() => onCommand("search")}
        >
          <Search size={17} />
        </button>
        <button
          className="icon-btn"
          type="button"
          title="Export filtered data to CSV"
          aria-label="Export filtered data to CSV"
          onClick={onExport}
        >
          <Download size={17} />
        </button>
        <button
          className="icon-btn"
          type="button"
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle theme"
          onClick={onTheme}
        >
          {isDark ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </header>
  );
}
