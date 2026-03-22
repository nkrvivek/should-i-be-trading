type BadgeVariant = "default" | "positive" | "negative" | "warning" | "info" | "critical";

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: "var(--bg-panel-raised)", color: "var(--text-secondary)" },
  positive: { bg: "rgba(5, 173, 152, 0.15)", color: "var(--positive)" },
  negative: { bg: "rgba(232, 93, 108, 0.15)", color: "var(--negative)" },
  warning: { bg: "rgba(245, 166, 35, 0.15)", color: "var(--warning)" },
  info: { bg: "rgba(139, 92, 246, 0.15)", color: "var(--info)" },
  critical: { bg: "rgba(232, 93, 108, 0.25)", color: "var(--negative)" },
};

type Props = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = "default" }: Props) {
  const style = variantStyles[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.03em",
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
