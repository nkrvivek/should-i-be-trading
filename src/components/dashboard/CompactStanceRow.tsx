export function CompactStanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-row" style={{ padding: "8px 0" }}>
      <span className="list-row-sublabel" style={{ fontSize: 12 }}>{label}</span>
      <span className="list-row-number num-tabular" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}
