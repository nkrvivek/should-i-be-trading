import type { PriceData } from "../../api/types";
import { formatPrice, formatVolume, calcChangePercent } from "../../lib/format";

type Props = {
  prices: Record<string, PriceData>;
  symbols: string[];
};

export function WatchlistPanel({ prices, symbols }: Props) {
  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Symbol</Th>
            <Th align="right">Last</Th>
            <Th align="right">Chg</Th>
            <Th align="right">Chg%</Th>
            <Th align="right">Bid</Th>
            <Th align="right">Ask</Th>
            <Th align="right">Vol</Th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((sym) => {
            const p = prices[sym];
            const chg = p ? (p.last != null && p.close != null ? p.last - p.close : null) : null;
            const chgPct = p ? calcChangePercent(p.last, p.close) : null;
            const tone = chg != null ? (chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--neutral)") : "var(--text-muted)";

            return (
              <tr key={sym} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
                <td style={{ padding: "0 8px", fontWeight: 500, color: "var(--text-primary)" }}>{sym}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>{p ? formatPrice(p.last) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>
                  {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}` : "---"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: tone }}>
                  {chgPct != null ? `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%` : "---"}
                </td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{p ? formatPrice(p.bid) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{p ? formatPrice(p.ask) : "---"}</td>
                <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>{p ? formatVolume(p.volume) : "---"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        padding: "4px 8px",
        textAlign: align,
        fontWeight: 500,
        fontSize: 9,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}
