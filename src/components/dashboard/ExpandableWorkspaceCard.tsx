export function ExpandableWorkspaceCard({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="list-row">
      <div className="list-row-main">
        <span className="list-row-label" style={{ fontSize: 13 }}>{title}</span>
        <span className="list-row-sublabel" style={{ fontSize: 13, lineHeight: 1.6 }}>{body}</span>
      </div>
      <button type="button" onClick={onClick} className="btn btn-secondary btn-sm">{cta}</button>
    </div>
  );
}
