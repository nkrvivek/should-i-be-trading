import { getAiUsage } from "../../api/anthropicClient";

/**
 * Displays current AI usage quota.
 * Shows remaining calls and warns when approaching limit.
 */
export function AiUsageBadge() {
  const usage = getAiUsage();

  if (usage.isOwnKey) {
    return (
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--positive)",
        padding: "2px 6px",
        background: "rgba(5, 173, 152, 0.1)",
        borderRadius: 3,
      }}>
        OWN KEY
      </span>
    );
  }

  const remaining = Math.max(0, usage.limit - usage.used);
  const isLow = remaining <= 2 && remaining > 0;
  const isExhausted = remaining === 0;

  const color = isExhausted
    ? "var(--negative)"
    : isLow
      ? "var(--warning)"
      : "var(--text-muted)";

  const bg = isExhausted
    ? "rgba(232, 93, 108, 0.1)"
    : isLow
      ? "rgba(239, 175, 68, 0.1)"
      : "transparent";

  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color,
      padding: "2px 6px",
      background: bg,
      borderRadius: 3,
      border: `1px solid ${isExhausted || isLow ? color : "var(--border-dim)"}`,
    }}>
      {isExhausted ? "LIMIT REACHED" : `${usage.used}/${usage.limit} AI calls`}
    </span>
  );
}
