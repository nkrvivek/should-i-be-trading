import { useState, useEffect, useCallback } from "react";
import { useBrokerStore } from "../../stores/brokerStore";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";
import { computeKeyMetrics } from "../../lib/strategy/payoff";
import { mapLegsToExecutionLegs } from "../../lib/execution/orderMapper";
import { runPreExecutionChecks } from "../../lib/execution/riskChecks";
import { executeStrategy } from "../../lib/execution/executionEngine";
import type { ExecutionPlan, ExecutionLeg, ExecutionResult } from "../../lib/execution/types";

interface Props {
  symbol: string;
  currentPrice: number;
  suggestion: StrategySuggestion;
  onClose: () => void;
  onComplete: () => void;
  onViewOrders: () => void;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 8,
  maxWidth: 720,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border-dim)",
};

const sectionStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid var(--border-dim)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-secondary)",
  marginBottom: 8,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
};

const badgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 4,
  display: "inline-block",
};

const btnBase: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 20px",
  borderRadius: 4,
  border: "none",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const riskBadgeColors: Record<string, { bg: string; color: string }> = {
  conservative: { bg: "rgba(5, 173, 152, 0.15)", color: "var(--positive)" },
  moderate: { bg: "rgba(234, 179, 8, 0.15)", color: "var(--warning)" },
  aggressive: { bg: "rgba(232, 93, 108, 0.15)", color: "var(--negative)" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrderReviewModal({
  symbol,
  currentPrice,
  suggestion,
  onClose,
  onComplete,
  onViewOrders,
}: Props) {
  const { connections, accounts, placeOrder } = useBrokerStore();

  // Filter out SnapTrade connections (no order placement support)
  const executableConnections = connections.filter((c) => c.slug !== "snaptrade");

  const [selectedConnectionId, setSelectedConnectionId] = useState(
    executableConnections[0]?.id ?? "",
  );
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [legStatuses, setLegStatuses] = useState<ExecutionLeg[]>([]);

  // Compute execution legs and metrics
  const executionLegs = mapLegsToExecutionLegs(suggestion.legs, currentPrice);
  const metrics = computeKeyMetrics(suggestion.legs, currentPrice);

  const selectedAccount = selectedConnectionId ? accounts[selectedConnectionId] ?? null : null;
  const isPaper = selectedAccount?.isPaperTrading ?? false;

  // Compute estimated cost
  const estimatedCost = executionLegs.reduce((sum, leg) => {
    const multiplier = leg.type === "stock" ? 1 : 100;
    const legCost = leg.estimatedPrice * leg.qty * multiplier;
    return sum + (leg.action === "buy" ? legCost : -legCost);
  }, 0);

  // Run pre-execution checks
  const preChecks = runPreExecutionChecks(selectedAccount, executionLegs, estimatedCost);

  // Detect undefined risk
  const hasUndefinedRisk = executionLegs.some(
    (l) => l.action === "sell" && (l.type === "call" || l.type === "put"),
  ) && !executionLegs.some(
    (l) => l.action === "buy" && l.type === "stock",
  ) && !executionLegs.some(
    (l) => l.action === "buy" && l.type === "call",
  );

  const hasOptions = executionLegs.some((l) => l.type === "call" || l.type === "put");
  const canExecute = riskAcknowledged && preChecks.passed && selectedConnectionId && !executing && !executionResult;

  // Initialize legStatuses when executionLegs change
  useEffect(() => {
    if (!executing && !executionResult) {
      setLegStatuses(executionLegs);
    }
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for live accounts
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Execute when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      doExecute();
      setCountdown(null);
    }
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExecuteClick = useCallback(() => {
    if (isPaper) {
      doExecute();
    } else {
      setCountdown(3);
    }
  }, [isPaper, selectedConnectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  async function doExecute() {
    setExecuting(true);
    const selectedConn = connections.find((c) => c.id === selectedConnectionId);

    const plan: ExecutionPlan = {
      strategyName: suggestion.strategyName,
      symbol,
      currentPrice,
      connectionId: selectedConnectionId,
      brokerName: selectedConn?.displayName ?? "",
      legs: executionLegs,
      estimatedCost,
      maxProfit: formatMetric(metrics.maxProfit),
      maxLoss: formatMetric(Math.abs(metrics.maxLoss)),
      breakeven: metrics.breakevens.length > 0
        ? metrics.breakevens.map((b) => `$${b.toFixed(2)}`).join(", ")
        : "N/A",
    };

    const result = await executeStrategy(
      plan,
      placeOrder,
      (legIndex, status, orderId, error) => {
        setLegStatuses((prev) => {
          const updated = [...prev];
          if (updated[legIndex]) {
            updated[legIndex] = {
              ...updated[legIndex],
              status: status as ExecutionLeg["status"],
              orderId,
              error,
            };
          }
          return updated;
        });
      },
    );

    setExecutionResult(result);
    setExecuting(false);
    if (result.success) {
      onComplete();
    }
  }

  const formatMetric = (n: number): string => {
    if (!isFinite(n) || Math.abs(n) > 1e8) return "Unlimited";
    const abs = Math.abs(n);
    if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}K`;
    return `$${abs.toFixed(0)}`;
  };

  const formatDollar = (n: number): string =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const statusIcon = (status: ExecutionLeg["status"]): string => {
    switch (status) {
      case "pending": return "\u23F3";
      case "placing": return "\uD83D\uDD04";
      case "filled": return "\u2705";
      case "failed": return "\u274C";
      case "cancelled": return "\u26D4";
      default: return "\u23F3";
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...monoStyle, fontSize: 16, fontWeight: 700 }}>
              Execute Strategy: {suggestion.strategyName}
            </span>
            <span
              style={{
                ...badgeStyle,
                background: riskBadgeColors[suggestion.riskLevel]?.bg,
                color: riskBadgeColors[suggestion.riskLevel]?.color,
              }}
            >
              {suggestion.riskLevel.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              ...monoStyle,
              fontSize: 18,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px 8px",
            }}
          >
            X
          </button>
        </div>

        {/* Strategy Overview */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Strategy Overview</div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-primary)",
              marginBottom: 10,
              lineHeight: 1.4,
            }}
          >
            {suggestion.description}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                ...badgeStyle,
                border: "1px solid var(--border-dim)",
                color: "var(--positive)",
              }}
            >
              Max Profit: {formatMetric(metrics.maxProfit)}
            </span>
            <span
              style={{
                ...badgeStyle,
                border: "1px solid var(--border-dim)",
                color: "var(--negative)",
              }}
            >
              Max Loss: {formatMetric(Math.abs(metrics.maxLoss))}
            </span>
            <span
              style={{
                ...badgeStyle,
                border: "1px solid var(--border-dim)",
                color: "var(--text-secondary)",
              }}
            >
              Breakeven:{" "}
              {metrics.breakevens.length > 0
                ? metrics.breakevens.map((b) => `$${b.toFixed(2)}`).join(", ")
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Legs Table */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Order Legs</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              ...monoStyle,
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {(executing || executionResult
                  ? ["Status", "Action", "Type", "Qty", "Strike", "Est. Price", "Subtotal"]
                  : ["Action", "Type", "Qty", "Strike", "Est. Price", "Subtotal"]
                ).map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-secondary)",
                      padding: "6px 8px",
                      textAlign: h === "Action" || h === "Type" || h === "Status" ? "left" : "right",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(executing || executionResult ? legStatuses : executionLegs).map((leg, i) => {
                const multiplier = leg.type === "stock" ? 1 : 100;
                const subtotal = leg.estimatedPrice * leg.qty * multiplier;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    {(executing || executionResult) && (
                      <td style={{ padding: "6px 8px" }}>
                        <span title={leg.error ?? leg.orderId ?? ""}>
                          {statusIcon(leg.status)}
                        </span>
                      </td>
                    )}
                    <td
                      style={{
                        padding: "6px 8px",
                        color:
                          leg.action === "buy"
                            ? "var(--positive)"
                            : "var(--negative)",
                        fontWeight: 600,
                      }}
                    >
                      {leg.action.toUpperCase()}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{leg.type.toUpperCase()}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      {leg.qty}
                      {leg.type !== "stock" ? ` (${leg.qty * 100} sh)` : ""}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      {leg.type === "stock" ? "\u2014" : `$${leg.strike.toFixed(0)}`}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>
                      {formatDollar(leg.estimatedPrice)}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "right",
                        fontWeight: 600,
                        color:
                          leg.action === "sell"
                            ? "var(--positive)"
                            : "var(--text-primary)",
                      }}
                    >
                      {leg.action === "sell" ? "-" : ""}
                      {formatDollar(subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Broker Selection */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Broker Account</div>
          {executableConnections.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "8px 0",
              }}
            >
              No eligible broker connections. Connect a broker (non-SnapTrade) in
              Settings to execute orders.
            </div>
          ) : (
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              disabled={executing || !!executionResult}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "6px 10px",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                background: "var(--bg-panel-raised)",
                width: "100%",
                cursor: "pointer",
              }}
            >
              {connections.map((conn) => {
                const connAccount = accounts[conn.id];
                const isSnaptrade = conn.slug === "snaptrade";
                return (
                  <option key={conn.id} value={conn.id} disabled={isSnaptrade}>
                    {conn.displayName}
                    {connAccount
                      ? ` — ${formatDollar(connAccount.equity)} equity`
                      : ""}
                    {connAccount?.isPaperTrading ? " (PAPER)" : ""}
                    {isSnaptrade ? " — Order placement not yet supported via SnapTrade" : ""}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Cost Summary */}
        <div style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ ...monoStyle, fontSize: 13, color: "var(--text-secondary)" }}>
              {estimatedCost > 0 ? "Estimated Net Cost" : "Estimated Net Credit"}
            </span>
            <span
              style={{
                ...monoStyle,
                fontSize: 18,
                fontWeight: 700,
                color:
                  estimatedCost > 0 ? "var(--text-primary)" : "var(--positive)",
              }}
            >
              {formatDollar(Math.abs(estimatedCost))}
            </span>
          </div>
        </div>

        {/* Risk Disclaimers */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Risk Disclaimers</div>

          {/* Always show */}
          <div
            style={{
              padding: "10px 14px",
              marginBottom: 8,
              borderRadius: 4,
              border: isPaper
                ? "1px solid var(--positive)"
                : "1px solid var(--warning)",
              background: isPaper
                ? "rgba(5, 173, 152, 0.06)"
                : "rgba(234, 179, 8, 0.06)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text-primary)",
            }}
          >
            {isPaper ? (
              "Paper trading \u2014 no real money at risk."
            ) : (
              "This will place REAL orders with real money. Past performance does not guarantee future results. This is not investment advice."
            )}
          </div>

          {/* Undefined risk warning */}
          {hasUndefinedRisk && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 8,
                borderRadius: 4,
                border: "2px solid var(--negative)",
                background: "rgba(232, 93, 108, 0.08)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.5,
                color: "var(--negative)",
              }}
            >
              WARNING: UNLIMITED LOSS POTENTIAL \u2014 only proceed if you fully
              understand the risks of naked short options.
            </div>
          )}

          {/* Options disclaimer */}
          {hasOptions && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 8,
                borderRadius: 4,
                border: "1px solid var(--warning)",
                background: "rgba(234, 179, 8, 0.06)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--text-primary)",
              }}
            >
              Options involve risk and are not suitable for all investors.
              You may lose the entire premium paid.
            </div>
          )}

          {/* Acknowledgment checkbox */}
          {!executionResult && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={riskAcknowledged}
                onChange={(e) => setRiskAcknowledged(e.target.checked)}
                disabled={executing}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              I understand the risks and want to proceed
            </label>
          )}
        </div>

        {/* Pre-Execution Checks */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Pre-Execution Checks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {preChecks.checks.map((check, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                <span style={{ color: check.passed ? "var(--positive)" : "var(--negative)" }}>
                  {check.passed ? "\u2713" : "\u2717"}
                </span>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                  {check.name}:
                </span>
                <span style={{ color: "var(--text-muted)" }}>{check.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Progress */}
        {executing && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Execution Progress</div>
            <div
              style={{
                ...monoStyle,
                fontSize: 13,
                color: "var(--text-primary)",
                padding: "8px 0",
              }}
            >
              Placing leg{" "}
              {legStatuses.filter(
                (l) => l.status === "filled" || l.status === "placing",
              ).length}{" "}
              of {legStatuses.length}...
            </div>
          </div>
        )}

        {/* Execution Result */}
        {executionResult && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Execution Result</div>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 4,
                border: `1px solid ${
                  executionResult.success
                    ? "var(--positive)"
                    : executionResult.partialExecution
                      ? "var(--warning)"
                      : "var(--negative)"
                }`,
                background: executionResult.success
                  ? "rgba(5, 173, 152, 0.06)"
                  : executionResult.partialExecution
                    ? "rgba(234, 179, 8, 0.06)"
                    : "rgba(232, 93, 108, 0.06)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: executionResult.success
                  ? "var(--positive)"
                  : executionResult.partialExecution
                    ? "var(--warning)"
                    : "var(--negative)",
              }}
            >
              {executionResult.success
                ? "Strategy executed successfully"
                : executionResult.partialExecution
                  ? `Partial execution \u2014 ${executionResult.totalFilled} of ${executionResult.legs.length} legs filled`
                  : `Execution failed \u2014 ${executionResult.totalFailed} leg(s) failed`}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {executionResult && (
            <button
              onClick={onViewOrders}
              style={{
                ...btnBase,
                background: "var(--accent-bg)",
                color: "var(--accent-text)",
              }}
            >
              View Orders
            </button>
          )}

          <button
            onClick={countdown !== null ? handleCancelCountdown : onClose}
            style={{
              ...btnBase,
              background: "none",
              border: "1px solid var(--border-dim)",
              color: "var(--text-secondary)",
            }}
          >
            {countdown !== null ? "Cancel" : executionResult ? "Close" : "Cancel"}
          </button>

          {!executionResult && (
            <button
              onClick={handleExecuteClick}
              disabled={!canExecute || countdown !== null}
              style={{
                ...btnBase,
                background: canExecute && countdown === null
                  ? "var(--negative)"
                  : "var(--border-dim)",
                color: canExecute && countdown === null
                  ? "#fff"
                  : "var(--text-muted)",
                opacity: canExecute && countdown === null ? 1 : 0.6,
                cursor: canExecute && countdown === null ? "pointer" : "not-allowed",
              }}
            >
              {countdown !== null
                ? `EXECUTING IN ${countdown}...`
                : executing
                  ? "EXECUTING..."
                  : "EXECUTE"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
