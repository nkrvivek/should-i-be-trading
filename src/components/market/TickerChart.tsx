import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";

type Props = {
  defaultSymbol?: string;
};

/**
 * TradingView Advanced Chart embed.
 * Free widget — no API key needed.
 * Displays real-time charts with full technical analysis tools.
 * Supports fullscreen expand for deeper analysis.
 */
export function TickerChart({ defaultSymbol = "SPY" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);
  const [expanded, setExpanded] = useState(false);
  const { theme } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = inputSymbol.trim().toUpperCase();
    if (s) setSymbol(s);
  };

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Escape key to exit expanded mode
  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expanded]);

  // Lock body scroll when expanded
  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

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
  }, [symbol, theme, expanded]);

  const wrapperStyle: React.CSSProperties = expanded
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        borderRadius: 0,
        overflow: "hidden",
      }
    : {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
        overflow: "hidden",
      };

  return (
    <div style={wrapperStyle}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-panel-raised)",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
          color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Chart
        </span>
        <button
          onClick={toggleExpand}
          title={expanded ? "Exit fullscreen (Esc)" : "Expand chart to fullscreen"}
          style={{
            background: "none",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            padding: "2px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: expanded ? "var(--warning)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {expanded ? "EXIT FULLSCREEN" : "EXPAND"}
        </button>
      </div>

      {/* Symbol search */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, padding: 8, flexShrink: 0 }}>
        <input
          type="text"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          placeholder="Enter ticker..."
          style={{
            flex: 1, padding: "6px 10px",
            background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
            borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 14,
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <button type="submit" disabled={!inputSymbol.trim()} style={{
          padding: "6px 14px", background: "var(--signal-core)",
          color: "#000", border: "none", borderRadius: 4,
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
          cursor: inputSymbol.trim() ? "pointer" : "not-allowed",
          opacity: inputSymbol.trim() ? 1 : 0.5,
        }}>
          CHART
        </button>
      </form>

      {/* Chart container — fills remaining space, expands to fullscreen when toggled */}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{
          flex: 1,
          minHeight: expanded ? undefined : 400,
          width: "100%",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
