/** Format number with sign prefix: "+1.23" / "-1.23" / "---" for nullish */
export function fmtSigned(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "---";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}`;
}

/** Format as percentage: "+12.34%" / "-5.60%". Multiplies by 100 if `raw` (default false) */
export function fmtPct(v: number | null | undefined, decimals = 2, raw = false): string {
  if (v == null || !Number.isFinite(v)) return "---";
  const pct = raw ? v : v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(decimals)}%`;
}

/** Format as USD: "$1.23M" / "$45,678" / "-$1,234" */
export function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  return `${value < 0 ? "-" : ""}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Format as exact USD: "$1,234.56" */
export function fmtUsdExact(value: number): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format as signed USD: "+$1,234" / "-$567" */
export function fmtSignedUsd(n: number): string {
  return `${n >= 0 ? "+" : "-"}${fmtUsd(Math.abs(n)).replace("-", "")}`;
}

/** Format as ratio: "1.23" / "---" for non-finite */
export function fmtRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "---";
  return value.toFixed(2);
}

/** Format nullable number: "1.23" / "---" */
export function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "---";
  return v.toFixed(decimals);
}

/** Format nullable exact USD: "$1,234.56" / "---" */
export function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "---";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Return CSS tone class for positive/negative/neutral values */
export function toneClass(value: number): "positive" | "negative" | "neutral" {
  return value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
}

/** Format price for display */
export function formatPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return "---";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format volume for display */
export function formatVolume(volume: number | null | undefined): string {
  if (volume == null || Number.isNaN(volume)) return "---";
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString();
}

/** Calculate price change percentage */
export function calcChangePercent(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
