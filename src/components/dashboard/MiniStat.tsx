export function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div className="heading-tight num-tabular" style={{ fontFamily: "var(--font-sans)", fontSize: 26, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
