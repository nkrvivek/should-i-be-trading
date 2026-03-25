/**
 * Shared tab bar component for sub-navigation within hub pages.
 * Uses URL search params for deep-linking and browser back/forward.
 */

import { useSearchParams } from "react-router-dom";

export interface TabDef {
  id: string;
  label: string;
  /** If set, tab only shows when user has access */
  gated?: boolean;
  /** Badge text (e.g. "PRO", "NEW") */
  badge?: string;
  badgeColor?: string;
}

interface TabBarProps {
  tabs: TabDef[];
  paramKey?: string; // URL search param key, default "tab"
}

export function TabBar({ tabs, paramKey = "tab" }: TabBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramKey) || tabs[0]?.id || "";

  const handleTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === tabs[0]?.id) {
      next.delete(paramKey); // clean URL for default tab
    } else {
      next.set(paramKey, id);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-panel)",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {tabs
        .filter((t) => t.gated !== false)
        .map((t) => {
          const isActive = activeTab === t.id || (!searchParams.get(paramKey) && t.id === tabs[0]?.id);
          return (
            <button
              key={t.id}
              onClick={() => handleTab(t.id)}
              style={{
                padding: "8px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.04em",
                color: isActive ? "var(--accent-bg)" : "var(--text-muted)",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${isActive ? "var(--accent-bg)" : "transparent"}`,
                cursor: "pointer",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t.label}
              {t.badge && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 999,
                    color: t.badgeColor ?? "var(--warning)",
                    border: `1px solid ${t.badgeColor ?? "var(--warning)"}`,
                    lineHeight: 1,
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

/** Hook to get the active tab from URL */
export function useActiveTab(tabs: TabDef[], paramKey = "tab"): string {
  const [searchParams] = useSearchParams();
  return searchParams.get(paramKey) || tabs[0]?.id || "";
}
