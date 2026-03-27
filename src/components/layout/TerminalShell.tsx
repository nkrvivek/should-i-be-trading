import type { ReactNode } from "react";
import { AppNav } from "../../App";
import { StatusBar } from "./StatusBar";
import type { CriData } from "../../api/types";

type Props = {
  children: ReactNode;
  cri?: CriData | null;
};

export function TerminalShell({ children, cri = null }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          padding: "0 16px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <img src="/logo-icon.svg" alt="SIBT" style={{ height: 28 }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--signal-core)",
              letterSpacing: "0.05em",
            }}
          >
            SIBT
          </span>
          <span
            className="app-nav-tagline"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Should I Be Trading?
          </span>
        </div>

        <AppNav />
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {children}
      </main>

      {/* Status Bar */}
      <StatusBar cri={cri} />
    </div>
  );
}
