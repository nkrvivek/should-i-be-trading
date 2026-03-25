import { useMarketHours } from "../../hooks/useMarketHours";
import { useHealth } from "../../hooks/useHealth";
import type { CriData } from "../../api/types";

type Props = {
  cri: CriData | null;
};

const statusLabels: Record<string, string> = {
  OPEN: "MARKET OPEN",
  PRE_MARKET: "PRE-MARKET",
  AFTER_HOURS: "AFTER HOURS",
  CLOSED: "CLOSED",
};

export function StatusBar({ cri }: Props) {
  const { status, etTime } = useMarketHours(1000);
  const { health } = useHealth();

  const ibOk = health?.ib_gateway?.port_listening ?? false;
  const uwOk = health?.uw ?? false;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 28,
        padding: "0 16px",
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border-dim)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <StatusDot ok={ibOk} label="IB" />
        <StatusDot ok={uwOk} label="UW" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {cri && (
          <span>
            CRI: <span style={{ color: criColor(cri.cri?.level ?? "") }}>{(cri.cri?.score ?? 0).toFixed(1)} {cri.cri?.level ?? "---"}</span>
          </span>
        )}
        <span style={{ color: status === "OPEN" ? "var(--positive)" : "var(--text-muted)" }}>
          {statusLabels[status] ?? status}
        </span>
        <span>{etTime} ET</span>
      </div>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: ok ? "var(--positive)" : "var(--negative)",
        }}
      />
      {label}
    </span>
  );
}

function criColor(level: string): string {
  switch (level) {
    case "LOW": return "var(--positive)";
    case "ELEVATED": return "var(--warning)";
    case "HIGH": return "var(--negative)";
    case "CRITICAL": return "var(--fault)";
    default: return "var(--neutral)";
  }
}
