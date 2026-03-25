import { useMemo } from "react";
import type { PayoffPoint } from "../../lib/strategy/payoff";

interface Props {
  data: PayoffPoint[];
  currentPrice: number;
  breakevens: number[];
  maxProfit: number;
  maxLoss: number;
  highlightPrice?: number | null;
  strikes?: number[];
}

const W = 640;
const H = 300;
const PAD = { top: 24, right: 40, bottom: 40, left: 64 };
const CW = W - PAD.left - PAD.right; // chart width
const CH = H - PAD.top - PAD.bottom; // chart height

export function PayoffChart({
  data,
  currentPrice,
  breakevens,
  maxProfit,
  maxLoss,
  highlightPrice,
  strikes = [],
}: Props) {
  const { pathD, fillAbove, fillBelow, scaleX, scaleY, xMin, xMax, yMin, yMax } =
    useMemo(() => {
      if (data.length === 0)
        return {
          pathD: "",
          fillAbove: "",
          fillBelow: "",
          scaleX: (_: number) => 0,
          scaleY: (_: number) => 0,
          xMin: 0,
          xMax: 0,
          yMin: 0,
          yMax: 0,
        };

      const xs = data.map((d) => d.price);
      const ys = data.map((d) => d.pnl);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const rawYMin = Math.min(...ys, 0);
      const rawYMax = Math.max(...ys, 0);
      const yPad = Math.max(Math.abs(rawYMax - rawYMin) * 0.1, 10);
      const yMin = rawYMin - yPad;
      const yMax = rawYMax + yPad;

      const sx = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * CW;
      const sy = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * CH;

      // Main line path
      const pts = data.map((d) => `${sx(d.price).toFixed(1)},${sy(d.pnl).toFixed(1)}`);
      const pathD = `M${pts.join("L")}`;

      // Fill above zero (green)
      const zeroY = sy(0);
      const abovePts: string[] = [];
      const belowPts: string[] = [];

      for (const d of data) {
        const x = sx(d.price);
        const y = sy(d.pnl);
        if (d.pnl >= 0) {
          abovePts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        } else {
          if (abovePts.length > 0) {
            abovePts.push(`${x.toFixed(1)},${zeroY.toFixed(1)}`);
          }
        }
        if (d.pnl <= 0) {
          belowPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        } else {
          if (belowPts.length > 0) {
            belowPts.push(`${x.toFixed(1)},${zeroY.toFixed(1)}`);
          }
        }
      }

      // Simplified fill: clip with the zero line
      const fillAbove = data.length
        ? `M${sx(xMin).toFixed(1)},${zeroY.toFixed(1)} ` +
          data
            .map((d) => {
              const y = d.pnl > 0 ? sy(d.pnl) : zeroY;
              return `L${sx(d.price).toFixed(1)},${y.toFixed(1)}`;
            })
            .join("") +
          ` L${sx(xMax).toFixed(1)},${zeroY.toFixed(1)} Z`
        : "";

      const fillBelow = data.length
        ? `M${sx(xMin).toFixed(1)},${zeroY.toFixed(1)} ` +
          data
            .map((d) => {
              const y = d.pnl < 0 ? sy(d.pnl) : zeroY;
              return `L${sx(d.price).toFixed(1)},${y.toFixed(1)}`;
            })
            .join("") +
          ` L${sx(xMax).toFixed(1)},${zeroY.toFixed(1)} Z`
        : "";

      return { pathD, fillAbove, fillBelow, scaleX: sx, scaleY: sy, xMin, xMax, yMin, yMax };
    }, [data]);

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        Add legs to see the payoff diagram
      </div>
    );
  }

  const zeroY = scaleY(0);

  // Y-axis ticks
  const yRange = yMax - yMin;
  const yStep = niceStep(yRange, 5);
  const yTicks: number[] = [];
  const yStart = Math.ceil(yMin / yStep) * yStep;
  for (let v = yStart; v <= yMax; v += yStep) yTicks.push(v);

  // X-axis ticks
  const xRange = xMax - xMin;
  const xStep = niceStep(xRange, 6);
  const xTicks: number[] = [];
  const xStart = Math.ceil(xMin / xStep) * xStep;
  for (let v = xStart; v <= xMax; v += xStep) xTicks.push(v);

  // Highlight point
  let hlPnl: number | null = null;
  if (highlightPrice != null && data.length > 1) {
    // Interpolate
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].price <= highlightPrice && data[i].price >= highlightPrice) {
        const t = (highlightPrice - data[i - 1].price) / (data[i].price - data[i - 1].price);
        hlPnl = data[i - 1].pnl + t * (data[i].pnl - data[i - 1].pnl);
        break;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", fontFamily: "var(--font-mono)" }}
    >
      {/* Fills */}
      <path d={fillAbove} fill="var(--signal-core)" opacity={0.12} />
      <path d={fillBelow} fill="var(--negative)" opacity={0.12} />

      {/* Zero line */}
      <line
        x1={PAD.left}
        y1={zeroY}
        x2={W - PAD.right}
        y2={zeroY}
        stroke="var(--text-muted)"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Grid lines */}
      {yTicks.map((v) => (
        <line
          key={`yg-${v}`}
          x1={PAD.left}
          y1={scaleY(v)}
          x2={W - PAD.right}
          y2={scaleY(v)}
          stroke="var(--border-dim)"
          strokeWidth={0.5}
        />
      ))}

      {/* Payoff curve */}
      <path d={pathD} fill="none" stroke="var(--text-primary)" strokeWidth={2} />

      {/* Current price marker */}
      <line
        x1={scaleX(currentPrice)}
        y1={PAD.top}
        x2={scaleX(currentPrice)}
        y2={H - PAD.bottom}
        stroke="var(--signal-core)"
        strokeWidth={1}
        strokeDasharray="4,3"
      />
      <text
        x={scaleX(currentPrice)}
        y={PAD.top - 6}
        textAnchor="middle"
        fill="var(--signal-core)"
        fontSize={9}
      >
        CURRENT
      </text>

      {/* Breakeven markers */}
      {breakevens.map((be, i) => (
        <g key={`be-${i}`}>
          <line
            x1={scaleX(be)}
            y1={PAD.top}
            x2={scaleX(be)}
            y2={H - PAD.bottom}
            stroke="var(--warning)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <text
            x={scaleX(be)}
            y={H - PAD.bottom + 12}
            textAnchor="middle"
            fill="var(--warning)"
            fontSize={9}
          >
            BE ${be.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Strike markers */}
      {strikes
        .filter((s) => s > xMin && s < xMax)
        .map((s, i) => (
          <line
            key={`st-${i}`}
            x1={scaleX(s)}
            y1={PAD.top}
            x2={scaleX(s)}
            y2={H - PAD.bottom}
            stroke="var(--border-dim)"
            strokeWidth={0.5}
            strokeDasharray="2,4"
          />
        ))}

      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text
          key={`yl-${v}`}
          x={PAD.left - 6}
          y={scaleY(v) + 3}
          textAnchor="end"
          fill="var(--text-muted)"
          fontSize={9}
        >
          ${formatNum(v)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((v) => (
        <text
          key={`xl-${v}`}
          x={scaleX(v)}
          y={H - PAD.bottom + 28}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={9}
        >
          ${v.toFixed(0)}
        </text>
      ))}

      {/* Highlight crosshair */}
      {highlightPrice != null && hlPnl != null && (
        <g>
          <line
            x1={scaleX(highlightPrice)}
            y1={PAD.top}
            x2={scaleX(highlightPrice)}
            y2={H - PAD.bottom}
            stroke="var(--info)"
            strokeWidth={1}
            opacity={0.6}
          />
          <circle
            cx={scaleX(highlightPrice)}
            cy={scaleY(hlPnl)}
            r={4}
            fill={hlPnl >= 0 ? "var(--signal-core)" : "var(--negative)"}
          />
          <rect
            x={scaleX(highlightPrice) + 6}
            y={scaleY(hlPnl) - 12}
            width={80}
            height={18}
            rx={3}
            fill="var(--bg-panel-raised)"
            stroke="var(--border-dim)"
          />
          <text
            x={scaleX(highlightPrice) + 10}
            y={scaleY(hlPnl) + 1}
            fill={hlPnl >= 0 ? "var(--signal-core)" : "var(--negative)"}
            fontSize={10}
            fontWeight={600}
          >
            ${hlPnl >= 0 ? "+" : ""}
            {formatNum(hlPnl)}
          </text>
        </g>
      )}

      {/* Max profit / loss labels */}
      <text
        x={W - PAD.right - 2}
        y={scaleY(maxProfit) - 4}
        textAnchor="end"
        fill="var(--signal-core)"
        fontSize={9}
        fontWeight={600}
      >
        MAX +${formatNum(maxProfit)}
      </text>
      <text
        x={W - PAD.right - 2}
        y={scaleY(maxLoss) + 12}
        textAnchor="end"
        fill="var(--negative)"
        fontSize={9}
        fontWeight={600}
      >
        MAX {formatNum(maxLoss)}
      </text>
    </svg>
  );
}

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

function formatNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(0);
}
