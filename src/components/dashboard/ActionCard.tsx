export function ActionCard({
  eyebrow,
  title,
  body,
  cta,
  secondary,
  onClick,
  onSecondaryClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary?: string;
  onClick: () => void;
  onSecondaryClick?: () => void;
}) {
  return (
    <div className="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, color: "var(--positive)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {body}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onClick} className="btn btn-primary btn-sm">{cta}</button>
        {secondary && onSecondaryClick && (
          <button type="button" onClick={onSecondaryClick} className="btn btn-secondary btn-sm">{secondary}</button>
        )}
      </div>
    </div>
  );
}
