type Props = {
  value: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "positive" | "negative" | "warning" | "neutral" | "default";
  className?: string;
};

const sizeMap = { sm: "11px", md: "13px", lg: "18px", xl: "28px" };

export function MonoValue({ value, size = "md", tone = "default", className = "" }: Props) {
  const color =
    tone === "default"
      ? "var(--text-primary)"
      : tone === "positive"
        ? "var(--positive)"
        : tone === "negative"
          ? "var(--negative)"
          : tone === "warning"
            ? "var(--warning)"
            : "var(--neutral)";

  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: sizeMap[size],
        fontWeight: 500,
        color,
        letterSpacing: "0em",
      }}
    >
      {value}
    </span>
  );
}
