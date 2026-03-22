import type { CriData, PriceData } from "../../api/types";
import { MonoValue } from "../shared/MonoValue";
import { DayChange } from "../shared/DayChange";
import { LiveBadge } from "../shared/LiveBadge";
import { fmt } from "../../lib/format";

type Props = {
  cri: CriData;
  prices: Record<string, PriceData>;
  connected: boolean;
};

export function RegimeStrip({ cri, prices, connected }: Props) {
  const vixPrice = prices["VIX"];
  const vvixPrice = prices["VVIX"];
  const spyPrice = prices["SPY"];

  const liveVix = vixPrice?.last ?? cri.vix ?? 0;
  const liveVvix = vvixPrice?.last ?? cri.vvix ?? 0;
  const liveSpy = spyPrice?.last ?? cri.spy ?? 0;
  const vvixVixRatio = liveVix > 0 ? liveVvix / liveVix : (cri.vvix_vix_ratio ?? 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
        padding: 12,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <MetricCell
        label="VIX"
        value={fmt(liveVix)}
        change={<DayChange value={liveVix} previous={vixPrice?.close ?? cri.vix} />}
        live={connected && !!vixPrice}
      />
      <MetricCell
        label="VVIX"
        value={fmt(liveVvix)}
        change={<DayChange value={liveVvix} previous={vvixPrice?.close ?? cri.vvix} />}
        live={connected && !!vvixPrice}
      />
      <MetricCell
        label="SPY"
        value={fmt(liveSpy)}
        change={<DayChange value={liveSpy} previous={spyPrice?.close ?? cri.spy} />}
        live={connected && !!spyPrice}
      />
      <MetricCell
        label="VVIX/VIX"
        value={fmt(vvixVixRatio)}
        tone={vvixVixRatio > 7 ? "warning" : "default"}
      />
      <MetricCell
        label="COR1M"
        value={fmt(cri.cor1m)}
        tone={cri.cor1m > 60 ? "negative" : "default"}
        change={
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {cri.cor1m_5d_change >= 0 ? "+" : ""}{cri.cor1m_5d_change.toFixed(1)} 5d
          </span>
        }
      />
      <MetricCell
        label="RVOL"
        value={`${fmt(cri.realized_vol)}%`}
        tone={cri.realized_vol > 25 ? "negative" : "default"}
      />
    </div>
  );
}

function MetricCell({
  label,
  value,
  change,
  live,
  tone = "default",
}: {
  label: string;
  value: string;
  change?: React.ReactNode;
  live?: boolean;
  tone?: "positive" | "negative" | "warning" | "default";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </span>
        {live !== undefined && <LiveBadge live={live} />}
      </div>
      <MonoValue value={value} size="md" tone={tone === "default" ? "default" : tone} />
      {change && <div>{change}</div>}
    </div>
  );
}
