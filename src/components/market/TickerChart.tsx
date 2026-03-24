import { useEffect, useRef, useState } from "react";
import { Panel } from "../layout/Panel";
import { useAppStore } from "../../stores/appStore";

type Props = {
  defaultSymbol?: string;
};

/**
 * TradingView Advanced Chart embed.
 * Free widget — no API key needed.
 * Displays real-time charts with full technical analysis tools.
 */
export function TickerChart({ defaultSymbol = "SPY" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);
  const { theme } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = inputSymbol.trim().toUpperCase();
    if (s) setSymbol(s);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "America/New_York",
      theme: theme === "dark" ? "dark" : "light",
      style: "1", // candlestick
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      studies: ["STD;MACD"],
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, theme]);

  return (
    <Panel title="Chart">
      {/* Symbol search */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          placeholder="Enter ticker..."
          style={{
            flex: 1, padding: "6px 10px",
            background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
            borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12,
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <button type="submit" disabled={!inputSymbol.trim()} style={{
          padding: "6px 14px", background: "var(--signal-core)",
          color: "#000", border: "none", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
          cursor: inputSymbol.trim() ? "pointer" : "not-allowed",
          opacity: inputSymbol.trim() ? 1 : 0.5,
        }}>
          CHART
        </button>
      </form>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: 800, width: "100%", borderRadius: 4, overflow: "hidden" }}
      />
    </Panel>
  );
}
