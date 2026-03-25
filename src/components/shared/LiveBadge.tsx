type Props = {
  live: boolean;
  label?: string;
};

export function LiveBadge({ live, label }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.05em",
        color: live ? "var(--positive)" : "var(--text-muted)",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: live ? "var(--positive)" : "var(--text-muted)",
          animation: live ? "pulse 2s infinite" : "none",
        }}
      />
      {label ?? (live ? "LIVE" : "STALE")}
    </span>
  );
}
