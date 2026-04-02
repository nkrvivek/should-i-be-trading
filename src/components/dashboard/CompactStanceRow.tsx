const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const compactStanceRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  paddingTop: 8,
  borderTop: "1px solid rgba(5, 173, 152, 0.12)",
};

export function CompactStanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={compactStanceRowStyle}>
      <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}
