import { fmtSigned, fmtPct } from "../../lib/format";

type Props = {
  value: number | null | undefined;
  previous: number | null | undefined;
  showPercent?: boolean;
  decimals?: number;
};

export function DayChange({ value, previous, showPercent = true, decimals = 2 }: Props) {
  if (value == null || previous == null || previous === 0) {
    return <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>---</span>;
  }

  const change = value - previous;
  const pct = ((value - previous) / Math.abs(previous)) * 100;
  const tone = change > 0 ? "var(--positive)" : change < 0 ? "var(--negative)" : "var(--neutral)";
  const arrow = change > 0 ? "\u2191" : change < 0 ? "\u2193" : "";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: tone,
      }}
    >
      <span>{fmtSigned(change, decimals)}</span>
      {showPercent && <span>({fmtPct(pct / 100, decimals)})</span>}
      {arrow && <span>{arrow}</span>}
    </span>
  );
}
