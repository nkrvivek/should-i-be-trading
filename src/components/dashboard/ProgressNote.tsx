export function ProgressNote({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
      <div className="list-row-sublabel" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}
