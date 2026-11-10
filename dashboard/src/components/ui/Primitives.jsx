import { useEffect } from "react";
import { RotateCcw, ScanEye, TriangleAlert, X } from "lucide-react";

export function ViewHead({ eyebrow, icon: Icon, title, subtitle, actions }) {
  return (
    <div className="view-head">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            {Icon && <Icon size={14} />}
            {eyebrow}
          </span>
        )}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="view-head-actions">{actions}</div>}
    </div>
  );
}

export function Notice({
  kind = "warning",
  icon: Icon = TriangleAlert,
  title,
  children,
  action,
}) {
  return (
    <div className={`notice ${kind}`}>
      <div className={`notice-icon${kind === "danger" ? " danger" : ""}`}>
        <Icon size={16} />
      </div>
      <div className="notice-body">
        <strong>{title}</strong>
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, onReset }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ScanEye size={24} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {onReset && (
        <button className="btn primary" type="button" onClick={onReset}>
          <RotateCcw size={14} />
          Reset filters
        </button>
      )}
    </div>
  );
}

export function ModalShell({
  title,
  subtitle,
  size = "",
  onClose,
  children,
  headExtra,
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal ${size}`.trim()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="modal-head-actions">
            {headExtra}
            <button
              className="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="pill-row" style={{ marginTop: 10 }}>
      {items.map((item) => (
        <span className="chip-country" key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "" }) {
  return (
    <div className={`stat-tile ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <em>{sub}</em>}
    </div>
  );
}
