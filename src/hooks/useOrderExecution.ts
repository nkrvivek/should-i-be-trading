import { useState, useEffect, useCallback } from "react";
import { useBrokerStore } from "../stores/brokerStore";
import type { StrategySuggestion } from "../lib/portfolio/strategyAnalyzer";
import { computeKeyMetrics } from "../lib/strategy/payoff";
import { mapLegsToExecutionLegs } from "../lib/execution/orderMapper";
import { runPreExecutionChecks } from "../lib/execution/riskChecks";
import { executeStrategy } from "../lib/execution/executionEngine";
import type { ExecutionPlan, ExecutionLeg, ExecutionResult } from "../lib/execution/types";

interface UseOrderExecutionArgs {
  symbol: string;
  currentPrice: number;
  suggestion: StrategySuggestion;
  onComplete: () => void;
}

export function useOrderExecution({
  symbol,
  currentPrice,
  suggestion,
  onComplete,
}: UseOrderExecutionArgs) {
  const { connections, accounts, placeOrder } = useBrokerStore();

  const [selectedConnectionId, setSelectedConnectionId] = useState(
    connections[0]?.id ?? "",
  );
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [legStatuses, setLegStatuses] = useState<ExecutionLeg[]>([]);

  // Derived values
  const executionLegs = mapLegsToExecutionLegs(suggestion.legs, currentPrice);
  const metrics = computeKeyMetrics(suggestion.legs, currentPrice);

  const selectedAccount = selectedConnectionId ? accounts[selectedConnectionId] ?? null : null;
  const isPaper = selectedAccount?.isPaperTrading ?? false;

  const estimatedCost = executionLegs.reduce((sum, leg) => {
    const multiplier = leg.type === "stock" ? 1 : 100;
    const legCost = leg.estimatedPrice * leg.qty * multiplier;
    return sum + (leg.action === "buy" ? legCost : -legCost);
  }, 0);

  const preChecks = runPreExecutionChecks(selectedAccount, executionLegs, estimatedCost);

  const hasUndefinedRisk = executionLegs.some(
    (l) => l.action === "sell" && (l.type === "call" || l.type === "put"),
  ) && !executionLegs.some(
    (l) => l.action === "buy" && l.type === "stock",
  ) && !executionLegs.some(
    (l) => l.action === "buy" && l.type === "call",
  );

  const hasOptions = executionLegs.some((l) => l.type === "call" || l.type === "put");
  const canExecute = riskAcknowledged && preChecks.passed && selectedConnectionId && !executing && !executionResult;

  // Execute the strategy
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

  // Initialize legStatuses when suggestion changes
  useEffect(() => {
    if (!executing && !executionResult) {
      setLegStatuses(executionLegs); // eslint-disable-line react-hooks/set-state-in-effect
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
      doExecute(); // eslint-disable-line react-hooks/set-state-in-effect
      setCountdown(null);
    }
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExecuteClick = useCallback(() => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (isPaper) {
      doExecute();
    } else {
      setCountdown(3);
    }
  }, [isPaper, selectedConnectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  return {
    // State
    connections,
    accounts,
    selectedConnectionId,
    setSelectedConnectionId,
    riskAcknowledged,
    setRiskAcknowledged,
    countdown,
    executing,
    executionResult,
    legStatuses,

    // Derived
    executionLegs,
    metrics,
    selectedAccount,
    isPaper,
    estimatedCost,
    preChecks,
    hasUndefinedRisk,
    hasOptions,
    canExecute,

    // Actions
    handleExecuteClick,
    handleCancelCountdown,
  };
}

/** Format a metric value as a dollar string */
export function formatMetric(n: number): string {
  if (!isFinite(n) || Math.abs(n) > 1e8) return "Unlimited";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}K`;
  return `$${abs.toFixed(0)}`;
}

/** Format a number as USD currency */
export function formatDollar(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Get the status icon emoji for a leg status */
export function statusIcon(status: ExecutionLeg["status"]): string {
  switch (status) {
    case "pending": return "\u23F3";
    case "placing": return "\uD83D\uDD04";
    case "filled": return "\u2705";
    case "failed": return "\u274C";
    case "cancelled": return "\u26D4";
    default: return "\u23F3";
  }
}
