import type { BrokerOrder } from "../brokers/types";
import type { WashSaleViolation } from "./types";

const WASH_SALE_WINDOW_DAYS = 30;

/**
 * Detect wash sale violations in trade history.
 * A wash sale occurs when you sell a security at a loss and repurchase
 * a substantially identical security within 30 days before or after.
 */
export function detectWashSales(trades: BrokerOrder[]): WashSaleViolation[] {
  const violations: WashSaleViolation[] = [];
  const filled = trades
    .filter((t) => t.status === "filled" && t.filledAvgPrice)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Group by symbol
  const bySymbol: Record<string, typeof filled> = {};
  for (const t of filled) {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = [];
    bySymbol[t.symbol].push(t);
  }

  for (const [symbol, symbolTrades] of Object.entries(bySymbol)) {
    const sells = symbolTrades.filter((t) => t.side === "sell");
    const buys = symbolTrades.filter((t) => t.side === "buy");

    for (const sell of sells) {
      const sellPrice = sell.filledAvgPrice ?? 0;
      const sellDate = new Date(sell.createdAt);

      // Find the most recent buy before this sell to determine cost basis
      const priorBuy = buys
        .filter((b) => new Date(b.createdAt) < sellDate)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!priorBuy) continue;
      const costBasis = priorBuy.filledAvgPrice ?? 0;
      const loss = (sellPrice - costBasis) * (sell.filledQty ?? sell.qty);

      if (loss >= 0) continue; // Not a loss sale

      // Check for repurchase within 30 days after
      for (const buy of buys) {
        const buyDate = new Date(buy.createdAt);
        const daysDiff = Math.round((buyDate.getTime() - sellDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > 0 && daysDiff <= WASH_SALE_WINDOW_DAYS) {
          violations.push({
            symbol,
            lossDate: sell.createdAt,
            lossAmount: Math.abs(loss),
            repurchaseDate: buy.createdAt,
            repurchasePrice: buy.filledAvgPrice ?? 0,
            disallowedLoss: Math.abs(loss),
            adjustedBasis: (buy.filledAvgPrice ?? 0) + Math.abs(loss) / (buy.filledQty ?? buy.qty),
            daysApart: daysDiff,
          });
          break; // Only flag once per sell
        }
      }

      // Check for repurchase within 30 days BEFORE the sell
      for (const buy of buys) {
        const buyDate = new Date(buy.createdAt);
        const daysDiff = Math.round((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > 0 && daysDiff <= WASH_SALE_WINDOW_DAYS && buyDate > (priorBuy ? new Date(priorBuy.createdAt) : new Date(0))) {
          const alreadyFlagged = violations.some(
            (v) => v.symbol === symbol && v.lossDate === sell.createdAt
          );
          if (!alreadyFlagged) {
            violations.push({
              symbol,
              lossDate: sell.createdAt,
              lossAmount: Math.abs(loss),
              repurchaseDate: buy.createdAt,
              repurchasePrice: buy.filledAvgPrice ?? 0,
              disallowedLoss: Math.abs(loss),
              adjustedBasis: (buy.filledAvgPrice ?? 0) + Math.abs(loss) / (buy.filledQty ?? buy.qty),
              daysApart: daysDiff,
            });
          }
          break;
        }
      }
    }
  }

  return violations.sort((a, b) => new Date(b.lossDate).getTime() - new Date(a.lossDate).getTime());
}
