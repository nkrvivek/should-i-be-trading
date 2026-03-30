/**
 * Pure cluster detection for insider trading activity.
 *
 * Identifies cases where multiple insiders are buying the same stock
 * within a short time window -- a historically significant signal.
 */

export interface InsiderTransaction {
  symbol: string;
  name: string;        // insider name
  title?: string;      // CEO, CFO, Director, etc.
  transactionType: string; // "P" for purchase, "S" for sale
  value: number;       // dollar value
  date: string;        // ISO date
  shares: number;
}

export interface InsiderCluster {
  symbol: string;
  insiders: { name: string; title?: string; value: number; date: string; shares: number }[];
  totalValue: number;
  dateRange: { start: string; end: string };
  clusterScore: number; // 0-100
}

const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_MIN_INSIDERS = 2;

/** Check if a transaction is a purchase */
function isPurchase(tx: InsiderTransaction): boolean {
  const t = tx.transactionType.toUpperCase();
  return t === "P" || t.includes("PURCHASE") || t.includes("BUY");
}

/** Difference in days between two ISO date strings */
function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / msPerDay;
}

/**
 * Detect insider buying clusters.
 *
 * 1. Filter to purchases only
 * 2. Group by symbol
 * 3. Sliding window: for each purchase, look forward `windowDays`
 * 4. If distinct insiders >= minInsiders, create a cluster
 * 5. Score based on insider count, total value, and date tightness
 * 6. Deduplicate overlapping clusters (keep highest score)
 */
export function detectInsiderClusters(
  transactions: InsiderTransaction[],
  windowDays = DEFAULT_WINDOW_DAYS,
  minInsiders = DEFAULT_MIN_INSIDERS,
): InsiderCluster[] {
  // 1. Filter to purchases
  const purchases = transactions.filter(isPurchase);
  if (purchases.length === 0) return [];

  // 2. Group by symbol
  const bySymbol = new Map<string, InsiderTransaction[]>();
  for (const tx of purchases) {
    const sym = tx.symbol.toUpperCase();
    if (!bySymbol.has(sym)) bySymbol.set(sym, []);
    bySymbol.get(sym)!.push(tx);
  }

  const rawClusters: InsiderCluster[] = [];

  for (const [symbol, txs] of bySymbol) {
    // 3. Sort by date ascending
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Sliding window
    for (let i = 0; i < txs.length; i++) {
      const windowTxs: InsiderTransaction[] = [txs[i]];

      for (let j = i + 1; j < txs.length; j++) {
        if (daysBetween(txs[i].date, txs[j].date) <= windowDays) {
          windowTxs.push(txs[j]);
        } else {
          break; // sorted, so no point continuing
        }
      }

      // Count distinct insiders
      const distinctInsiders = new Set(windowTxs.map((t) => t.name));
      if (distinctInsiders.size < minInsiders) continue;

      // Deduplicate insiders: pick the largest transaction per insider
      const insiderMap = new Map<string, InsiderTransaction>();
      for (const tx of windowTxs) {
        const existing = insiderMap.get(tx.name);
        if (!existing || tx.value > existing.value) {
          insiderMap.set(tx.name, tx);
        }
      }

      const insiders = [...insiderMap.values()].map((tx) => ({
        name: tx.name,
        title: tx.title,
        value: tx.value,
        date: tx.date,
        shares: tx.shares,
      }));

      const totalValue = insiders.reduce((sum, ins) => sum + ins.value, 0);
      const dates = insiders.map((ins) => ins.date).sort();
      const start = dates[0];
      const end = dates[dates.length - 1];
      const actualSpan = daysBetween(start, end);
      const tightness = windowDays > 0 ? 1 - actualSpan / windowDays : 1;

      // Score: insider count + value + tightness
      const insiderCount = insiders.length;
      const score = Math.min(
        100,
        insiderCount * 20 + (totalValue / 100_000) * 10 + tightness * 15,
      );

      rawClusters.push({
        symbol,
        insiders,
        totalValue,
        dateRange: { start, end },
        clusterScore: Math.round(score * 10) / 10,
      });
    }
  }

  // 6. Deduplicate overlapping clusters per symbol — keep highest score
  const best = new Map<string, InsiderCluster>();
  for (const cluster of rawClusters) {
    const existing = best.get(cluster.symbol);
    if (!existing || cluster.clusterScore > existing.clusterScore) {
      best.set(cluster.symbol, cluster);
    }
  }

  return [...best.values()].sort((a, b) => b.clusterScore - a.clusterScore);
}
