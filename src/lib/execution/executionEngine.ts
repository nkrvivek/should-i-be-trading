/**
 * Execution Engine — orchestrates multi-leg order placement.
 * Places legs sequentially (buys first, then sells).
 * If a leg fails, remaining legs are cancelled.
 */
import type { OrderRequest, BrokerOrder } from "../brokers/types";
import type { ExecutionPlan, ExecutionLeg, ExecutionResult } from "./types";
import { mapLegsToOrders } from "./orderMapper";

/** Cooldown tracker to prevent double-submit */
let lastExecutionTime = 0;
const COOLDOWN_MS = 30_000;

/**
 * Check if execution is currently on cooldown.
 * Returns remaining ms if on cooldown, 0 otherwise.
 */
export function getExecutionCooldownRemaining(): number {
  const elapsed = Date.now() - lastExecutionTime;
  return Math.max(0, COOLDOWN_MS - elapsed);
}

/**
 * Execute a multi-leg strategy by placing orders sequentially.
 *
 * - Buys are placed first (need to own before selling covered)
 * - If any leg fails, remaining legs are marked "cancelled"
 * - Calls onProgress after each leg for real-time UI updates
 * - 30-second cooldown after execution to prevent double-submit
 */
export async function executeStrategy(
  plan: ExecutionPlan,
  placeOrder: (connectionId: string, order: OrderRequest) => Promise<BrokerOrder>,
  onProgress: (legIndex: number, status: ExecutionLeg["status"], orderId?: string, error?: string) => void,
): Promise<ExecutionResult> {
  // Check cooldown
  const cooldown = getExecutionCooldownRemaining();
  if (cooldown > 0) {
    return {
      success: false,
      legs: plan.legs.map((l) => ({ ...l, status: "failed" as const, error: `Cooldown active — wait ${Math.ceil(cooldown / 1000)}s` })),
      totalFilled: 0,
      totalFailed: plan.legs.length,
      partialExecution: false,
    };
  }

  const orders = mapLegsToOrders(
    plan.legs.map((l) => ({
      action: l.action,
      type: l.type,
      qty: l.qty,
      strike: l.strike,
      premium: l.premium,
    })),
    plan.symbol,
    plan.currentPrice,
  );

  const resultLegs: ExecutionLeg[] = [...plan.legs];
  let totalFilled = 0;
  let totalFailed = 0;
  let hasFailed = false;

  for (let i = 0; i < orders.length; i++) {
    if (hasFailed) {
      // Mark remaining as cancelled
      resultLegs[i] = { ...resultLegs[i], status: "cancelled" };
      onProgress(i, "cancelled");
      continue;
    }

    // Mark as placing
    resultLegs[i] = { ...resultLegs[i], status: "placing" };
    onProgress(i, "placing");

    try {
      const result = await placeOrder(plan.connectionId, orders[i]);
      resultLegs[i] = {
        ...resultLegs[i],
        status: "filled",
        orderId: result.id,
      };
      totalFilled++;
      onProgress(i, "filled", result.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Order placement failed";
      resultLegs[i] = {
        ...resultLegs[i],
        status: "failed",
        error: message,
      };
      totalFailed++;
      hasFailed = true;
      onProgress(i, "failed", undefined, message);
    }
  }

  // Set cooldown
  lastExecutionTime = Date.now();

  const partialExecution = totalFilled > 0 && totalFailed > 0;

  return {
    success: totalFailed === 0,
    legs: resultLegs,
    totalFilled,
    totalFailed,
    partialExecution,
  };
}
