import { useState } from "react";
import type { ColumnMapping } from "../../lib/strategy/types";

type Props = {
  headers: string[];
  initialMapping: ColumnMapping;
  onApply: (mapping: ColumnMapping) => void;
  onCancel: () => void;
};

const TARGET_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "symbol", label: "Symbol / Ticker", required: true },
  { key: "qty", label: "Quantity / Shares", required: false },
  { key: "side", label: "Side (Long/Short)", required: false },
  { key: "costBasis", label: "Cost Basis / Avg Price", required: false },
  { key: "currentPrice", label: "Current Price", required: false },
  { key: "marketValue", label: "Market Value", required: false },
  { key: "pnl", label: "P&L (Unrealized)", required: false },
  { key: "assetType", label: "Asset Type", required: false },
  { key: "strike", label: "Strike Price", required: false },
  { key: "expiry", label: "Expiration Date", required: false },
  { key: "optionType", label: "Option Type (Call/Put)", required: false },
  { key: "buyDate", label: "Buy Date", required: false },
  { key: "sellDate", label: "Sell Date", required: false },
  { key: "proceeds", label: "Proceeds", required: false },
];

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
};

export function ColumnMapperDialog({ headers, initialMapping, onApply, onCancel }: Props) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const field of TARGET_FIELDS) {
      const val = initialMapping[field.key];
      init[field.key] = val || "__skip__";
    }
    return init;
  });

  const handleChange = (field: string, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    const result: Partial<ColumnMapping> = {};
    for (const [key, val] of Object.entries(mapping)) {
      if (val && val !== "__skip__") {
        (result as Record<string, string>)[key] = val;
      }
    }
    // Symbol is required — fallback to first header
    if (!result.symbol) {
      result.symbol = headers[0] || "";
    }
    onApply(result as ColumnMapping);
  };

  const symbolMapped = mapping.symbol && mapping.symbol !== "__skip__";

  return (
    <div style={{
      border: "1px solid var(--border-dim, #e2e8f0)",
      borderRadius: 6,
      padding: 16,
      marginBottom: 16,
      background: "var(--bg-panel-raised, #f8fafc)",
    }}>
      <div style={{
        ...monoStyle,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase" as const,
        color: "var(--text-secondary, #64748b)",
        marginBottom: 4,
      }}>
        Column Mapping
      </div>
      <div style={{ ...monoStyle, fontSize: 12, color: "var(--text-muted, #94a3b8)", marginBottom: 16 }}>
        Map your CSV columns to the correct fields. Symbol is required; all others are optional.
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Maps To
              </th>
              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Your CSV Column
              </th>
            </tr>
          </thead>
          <tbody>
            {TARGET_FIELDS.map(({ key, label, required }) => (
              <tr key={key} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  {label}
                  {required && (
                    <span style={{ color: "var(--negative, #dc2626)", marginLeft: 4, fontSize: 11 }}>*</span>
                  )}
                </td>
                <td style={{ padding: "6px 10px" }}>
                  <select
                    value={mapping[key] || "__skip__"}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{
                      ...monoStyle,
                      fontSize: 13,
                      padding: "4px 8px",
                      border: "1px solid var(--border-dim, #e2e8f0)",
                      borderRadius: 4,
                      background: "var(--bg-panel, #fff)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      width: "100%",
                      maxWidth: 260,
                    }}
                  >
                    <option value="__skip__">-- Skip --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={handleApply}
          disabled={!symbolMapped}
          style={{
            ...monoStyle,
            fontSize: 13,
            padding: "8px 20px",
            background: symbolMapped ? "var(--signal-core, #05AD98)" : "var(--border-dim)",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: symbolMapped ? "pointer" : "not-allowed",
            fontWeight: 600,
          }}
        >
          APPLY MAPPING
        </button>
        <button
          onClick={onCancel}
          style={{
            ...monoStyle,
            fontSize: 13,
            padding: "8px 16px",
            border: "1px solid var(--border-dim)",
            color: "var(--text-secondary)",
            borderRadius: 4,
            background: "none",
            cursor: "pointer",
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
