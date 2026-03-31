import { useState } from "react";
import { fetchCompanyInfo, getCachedCompanyInfo } from "../../lib/companyInfo";

export function TickerWithCompanyName({
  symbol,
  style,
}: {
  symbol: string;
  style?: React.CSSProperties;
}) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [companyInfo, setCompanyInfo] = useState(() => getCachedCompanyInfo(normalizedSymbol));
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);

    if (companyInfo || loading) return;

    setLoading(true);
    fetchCompanyInfo(normalizedSymbol)
      .then((info) => {
        if (info) setCompanyInfo(info);
      })
      .finally(() => setLoading(false));
  };

  return (
    <span
      onMouseEnter={handleOpen}
      onMouseLeave={() => setOpen(false)}
      onFocus={handleOpen}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      title={companyInfo?.name ?? normalizedSymbol}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        outline: "none",
      }}
    >
      <span style={style}>{normalizedSymbol}</span>
      {open && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            minWidth: 180,
            maxWidth: 280,
            padding: "8px 10px",
            borderRadius: 4,
            border: "1px solid var(--border-dim)",
            background: "var(--bg-panel)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.4,
              color: "var(--text-primary)",
              whiteSpace: "normal",
            }}
          >
            {companyInfo?.name ?? (loading ? "Loading company name..." : "Company name unavailable")}
          </span>
          {companyInfo?.sector && (
            <span
              style={{
                display: "block",
                marginTop: 3,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {companyInfo.sector}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
