import { useState, useRef, useCallback } from "react";
import { validateFile, sanitizeContent } from "../../lib/csv/csvSanitizer";
import { parseCsvContent } from "../../lib/csv/csvParser";
import { autoMapColumns } from "../../lib/csv/columnMapper";
import { useManualPortfolioStore } from "../../lib/portfolio/manualPortfolioStore";
import { ColumnMapperDialog } from "./ColumnMapperDialog";
import type { ColumnMapping, ManualPosition } from "../../lib/strategy/types";
import type { MappingResult } from "../../lib/csv/columnMapper";
import type { ParseResult } from "../../lib/csv/csvParser";

type UploadState = "idle" | "parsing" | "preview" | "error";

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
};

const headerStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary, #64748b)",
  marginBottom: 12,
};

export default function CsvUploadPanel() {
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPositions = useManualPortfolioStore((s) => s.addPositions);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setState("parsing");
    setWarnings([]);
    setErrorMsg("");

    // Step 1: validate file metadata
    const validation = validateFile(file);
    if (!validation.valid) {
      setState("error");
      setErrorMsg(validation.error || "Invalid file.");
      return;
    }

    // Step 2: read file as text
    let text: string;
    try {
      text = await file.text();
    } catch {
      setState("error");
      setErrorMsg("Failed to read file.");
      return;
    }

    // Step 3: sanitize content
    const sanitized = sanitizeContent(text);
    if (!sanitized.valid || !sanitized.content) {
      setState("error");
      setErrorMsg(sanitized.error || "Sanitization failed.");
      return;
    }
    if (sanitized.warnings.length > 0) {
      setWarnings(sanitized.warnings);
    }

    // Step 4: parse CSV
    const parsed = parseCsvContent(sanitized.content);
    if (parsed.rowCount === 0) {
      setState("error");
      setErrorMsg("No data rows found in file.");
      return;
    }
    setParseResult(parsed);

    // Step 5: auto-map columns
    const mapping = autoMapColumns(parsed.headers);
    setMappingResult(mapping);

    // Step 6: low confidence -> show mapper dialog
    if (mapping.confidence < 0.6) {
      setShowMapper(true);
    }

    setState("preview");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be selected again
    e.target.value = "";
  }, [processFile]);

  const handleMappingApply = useCallback((mapping: ColumnMapping) => {
    if (mappingResult) {
      setMappingResult({ ...mappingResult, mapping });
    }
    setShowMapper(false);
  }, [mappingResult]);

  const handleImport = useCallback(() => {
    if (!parseResult || !mappingResult) return;

    const { mapping } = mappingResult;
    const positions: ManualPosition[] = [];
    const now = new Date().toISOString();

    for (const row of parseResult.rows) {
      const symbol = (row[mapping.symbol] || "").toUpperCase().trim();
      if (!symbol) continue;

      const qty = parseFloat(row[mapping.qty || ""] || "0") || 0;
      const costBasis = parseFloat(row[mapping.costBasis || ""] || "0") || 0;
      const currentPrice = parseFloat(row[mapping.currentPrice || ""] || "0") || costBasis;
      const marketValue = parseFloat(row[mapping.marketValue || ""] || "0") || qty * currentPrice;
      const pnlRaw = parseFloat(row[mapping.pnl || ""] || "");
      const unrealizedPL = isNaN(pnlRaw) ? marketValue - qty * costBasis : pnlRaw;
      const unrealizedPLPercent = qty * costBasis !== 0 ? (unrealizedPL / Math.abs(qty * costBasis)) * 100 : 0;

      const sideRaw = (row[mapping.side || ""] || "long").toLowerCase().trim();
      const side: "long" | "short" = sideRaw.includes("short") || sideRaw === "sell" || sideRaw === "s" ? "short" : "long";

      const assetTypeRaw = (row[mapping.assetType || ""] || "stock").toLowerCase().trim();
      const assetType: "stock" | "option" | "crypto" =
        assetTypeRaw.includes("option") || assetTypeRaw.includes("call") || assetTypeRaw.includes("put") ? "option" :
        assetTypeRaw.includes("crypto") || assetTypeRaw.includes("btc") || assetTypeRaw.includes("eth") ? "crypto" : "stock";

      const strike = parseFloat(row[mapping.strike || ""] || "") || undefined;
      const expiry = row[mapping.expiry || ""] || undefined;
      const optionTypeRaw = (row[mapping.optionType || ""] || "").toLowerCase().trim();
      const optionType: "call" | "put" | undefined =
        optionTypeRaw.includes("call") || optionTypeRaw === "c" ? "call" :
        optionTypeRaw.includes("put") || optionTypeRaw === "p" ? "put" : undefined;

      positions.push({
        id: `csv-${Date.now()}-${positions.length}`,
        symbol,
        qty: Math.abs(qty) || 1,
        side,
        avgEntryPrice: costBasis,
        currentPrice,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent,
        assetType,
        strike,
        expiry,
        optionType,
        importedAt: now,
        source: mappingResult.detectedBroker || fileName,
      });
    }

    if (positions.length === 0) {
      setState("error");
      setErrorMsg("No valid positions could be extracted from the CSV.");
      return;
    }

    addPositions(positions, mappingResult.detectedBroker || fileName);
    // Reset to idle after import
    setState("idle");
    setParseResult(null);
    setMappingResult(null);
    setFileName("");
  }, [parseResult, mappingResult, fileName, addPositions]);

  const handleReset = useCallback(() => {
    setState("idle");
    setErrorMsg("");
    setWarnings([]);
    setFileName("");
    setParseResult(null);
    setMappingResult(null);
    setShowMapper(false);
  }, []);

  // Mapped preview rows
  const previewRows = parseResult && mappingResult ? parseResult.rows.slice(0, 5).map((row) => {
    const m = mappingResult.mapping;
    return {
      symbol: row[m.symbol] || "",
      qty: row[m.qty || ""] || "",
      side: row[m.side || ""] || "",
      costBasis: row[m.costBasis || ""] || "",
      currentPrice: row[m.currentPrice || ""] || "",
      marketValue: row[m.marketValue || ""] || "",
      pnl: row[m.pnl || ""] || "",
    };
  }) : [];

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>CSV Import</div>

      {/* Column Mapper Dialog */}
      {showMapper && parseResult && mappingResult && (
        <ColumnMapperDialog
          headers={parseResult.headers}
          initialMapping={mappingResult.mapping}
          onApply={handleMappingApply}
          onCancel={() => setShowMapper(false)}
        />
      )}

      {/* IDLE STATE: Drop zone */}
      {state === "idle" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "var(--signal-core, #05AD98)" : "var(--border-dim, #e2e8f0)"}`,
            borderRadius: 8,
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--accent-bg, #f0fdfa)" : "var(--bg-base, #fafafa)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>
            {/* Simple file icon via unicode */}
            &#128196;
          </div>
          <div style={{ ...monoStyle, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Drop CSV file or click to browse
          </div>
          <div style={{ ...monoStyle, fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
            Accepts .csv, .tsv, .txt &mdash; Max 1 MB
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* PARSING STATE */}
      {state === "parsing" && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ ...monoStyle, fontSize: 14, color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 8 }}>&#9881;</span>
            Parsing {fileName}...
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {state === "error" && (
        <div style={{
          border: "1px solid var(--negative, #dc2626)",
          borderRadius: 6,
          padding: "24px 16px",
          background: "var(--bg-base, #fafafa)",
          textAlign: "center",
        }}>
          <div style={{ ...monoStyle, fontSize: 14, color: "var(--negative, #dc2626)", marginBottom: 16, fontWeight: 600 }}>
            {errorMsg}
          </div>
          <button
            onClick={handleReset}
            style={{
              ...monoStyle,
              fontSize: 13,
              padding: "6px 20px",
              border: "1px solid var(--negative, #dc2626)",
              color: "var(--negative, #dc2626)",
              borderRadius: 4,
              background: "none",
              cursor: "pointer",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* PREVIEW STATE */}
      {state === "preview" && parseResult && mappingResult && (
        <div>
          {/* Metadata badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            <span style={{ ...monoStyle, fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "var(--accent-bg, #f0fdfa)", color: "var(--accent-text, #0d9488)", border: "1px solid var(--border-dim)" }}>
              {parseResult.rowCount} rows
            </span>
            {mappingResult.detectedBroker && (
              <span style={{ ...monoStyle, fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "var(--accent-bg, #f0fdfa)", color: "var(--accent-text, #0d9488)", border: "1px solid var(--border-dim)" }}>
                {mappingResult.detectedBroker.toUpperCase()}
              </span>
            )}
            <span style={{
              ...monoStyle,
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 999,
              border: "1px solid var(--border-dim)",
              background: mappingResult.confidence >= 0.8 ? "var(--accent-bg, #f0fdfa)" : mappingResult.confidence >= 0.6 ? "#fffbeb" : "#fef2f2",
              color: mappingResult.confidence >= 0.8 ? "var(--positive, #16a34a)" : mappingResult.confidence >= 0.6 ? "var(--warning, #d97706)" : "var(--negative, #dc2626)",
            }}>
              {Math.round(mappingResult.confidence * 100)}% confidence
            </span>
            <span style={{ ...monoStyle, fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
              {fileName}
            </span>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              ...monoStyle,
              fontSize: 12,
              padding: "8px 12px",
              marginBottom: 12,
              borderRadius: 4,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "var(--warning, #d97706)",
              maxHeight: 80,
              overflowY: "auto",
            }}>
              {warnings.slice(0, 5).map((w, i) => (
                <div key={i}>{w}</div>
              ))}
              {warnings.length > 5 && <div>...and {warnings.length - 5} more</div>}
            </div>
          )}

          {/* Column mapping summary */}
          <div style={{ ...monoStyle, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            Mapped: {Object.entries(mappingResult.mapping).filter(([, v]) => v).map(([k, v]) => `${k} \u2190 "${v}"`).join(", ")}
          </div>

          {/* Preview table */}
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  {["Symbol", "Qty", "Side", "Cost Basis", "Current", "Mkt Value", "P&L"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "right", fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{row.symbol}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.qty}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.side || "--"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.costBasis || "--"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.currentPrice || "--"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.marketValue || "--"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.pnl || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parseResult.rowCount > 5 && (
              <div style={{ ...monoStyle, fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                Showing 5 of {parseResult.rowCount} rows
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleImport}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "8px 24px",
                background: "var(--signal-core, #05AD98)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              IMPORT {parseResult.rowCount} POSITION{parseResult.rowCount !== 1 ? "S" : ""}
            </button>
            <button
              onClick={() => setShowMapper(true)}
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
              CHANGE MAPPING
            </button>
            <button
              onClick={handleReset}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "8px 16px",
                border: "1px solid var(--border-dim)",
                color: "var(--text-muted)",
                borderRadius: 4,
                background: "none",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
