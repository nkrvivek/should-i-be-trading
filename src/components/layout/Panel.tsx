import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  stale?: boolean;
  className?: string;
};

export function Panel({ title, children, onRefresh, loading, stale, className = "" }: Props) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--bg-panel-raised)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {title}
          </span>
          {stale && (
            <span style={{ fontSize: 11, color: "var(--warning)", fontFamily: "var(--font-mono)" }}>
              STALE
            </span>
          )}
          {loading && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              ...
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              cursor: loading ? "default" : "pointer",
              padding: "2px 4px",
            }}
          >
            REFRESH
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        {children}
      </div>
    </div>
  );
}
