type Column = {
  width: number | string;
};

type Props = {
  rows?: number;
  columns?: Column[];
};

const defaultColumns: Column[] = [
  { width: 48 },
  { width: 36 },
  { width: "flex" },
];

export function SkeletonRows({ rows = 4, columns = defaultColumns }: Props) {
  return (
    <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {columns.map((col, j) => {
            const isFlex = col.width === "flex";
            return (
              <div
                key={j}
                className="skeleton-pulse"
                style={{
                  width: isFlex ? undefined : col.width,
                  flex: isFlex ? 1 : undefined,
                  height: 14,
                  borderRadius: 3,
                  background: "var(--border-dim)",
                  animationDelay: j > 0 ? `${i * 80 + (j - 1) * 40}ms` : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
