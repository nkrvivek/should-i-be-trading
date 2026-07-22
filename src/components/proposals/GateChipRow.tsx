import type { GateChip } from "../../lib/proposalUi";

type Props = {
  chips: GateChip[];
};

/** Small pill row rendering each gate name + pass/fail state from proposal_signals. */
export function GateChipRow({ chips }: Props) {
  if (chips.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {chips.map((chip) => (
        <span
          key={chip.name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 22,
            padding: "0 10px",
            borderRadius: "var(--radius-pill)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.02em",
            background: chip.passed ? "rgba(0, 214, 79, 0.12)" : "rgba(232, 93, 108, 0.12)",
            color: chip.passed ? "var(--positive)" : "var(--negative)",
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden="true">{chip.passed ? "✓" : "✕"}</span>
          {chip.name.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
