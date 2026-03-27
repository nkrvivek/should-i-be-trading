export interface ExecutionPlan {
  strategyName: string;
  symbol: string;
  currentPrice: number;
  connectionId: string;
  brokerName: string;
  legs: ExecutionLeg[];
  estimatedCost: number; // positive = debit, negative = credit
  maxProfit: string;
  maxLoss: string;
  breakeven: string;
}

export interface ExecutionLeg {
  action: "buy" | "sell";
  type: "stock" | "call" | "put";
  qty: number;
  strike: number;
  premium: number;
  estimatedPrice: number; // live market price
  status: "pending" | "placing" | "filled" | "failed" | "cancelled";
  orderId?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  legs: ExecutionLeg[];
  totalFilled: number;
  totalFailed: number;
  partialExecution: boolean;
}

export interface PreExecutionCheck {
  passed: boolean;
  checks: { name: string; passed: boolean; message: string }[];
}
