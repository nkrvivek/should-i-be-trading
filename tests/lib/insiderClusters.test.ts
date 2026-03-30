import { describe, it, expect } from "vitest";
import {
  detectInsiderClusters,
  type InsiderTransaction,
} from "../../src/lib/activity/insiderClusters";

function tx(overrides: Partial<InsiderTransaction> & { symbol: string; name: string }): InsiderTransaction {
  return {
    transactionType: "P",
    value: 100_000,
    date: "2026-03-15",
    shares: 1000,
    ...overrides,
  };
}

describe("detectInsiderClusters", () => {
  it("returns empty for no transactions", () => {
    expect(detectInsiderClusters([])).toEqual([]);
  });

  it("returns empty for only sales", () => {
    const sales = [
      tx({ symbol: "AAPL", name: "Tim Cook", transactionType: "S" }),
      tx({ symbol: "AAPL", name: "Luca Maestri", transactionType: "S" }),
    ];
    expect(detectInsiderClusters(sales)).toEqual([]);
  });

  it("returns empty for single insider (need minInsiders=2)", () => {
    const single = [
      tx({ symbol: "AAPL", name: "Tim Cook", date: "2026-03-15" }),
    ];
    expect(detectInsiderClusters(single)).toEqual([]);
  });

  it("detects cluster when two insiders buy within 7 days", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Tim Cook", date: "2026-03-15", value: 200_000 }),
      tx({ symbol: "AAPL", name: "Luca Maestri", date: "2026-03-18", value: 150_000 }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].symbol).toBe("AAPL");
    expect(clusters[0].insiders).toHaveLength(2);
    expect(clusters[0].totalValue).toBe(350_000);
    expect(clusters[0].dateRange.start).toBe("2026-03-15");
    expect(clusters[0].dateRange.end).toBe("2026-03-18");
  });

  it("returns empty when two insiders are 10 days apart (outside 7-day window)", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Tim Cook", date: "2026-03-01" }),
      tx({ symbol: "AAPL", name: "Luca Maestri", date: "2026-03-12" }),
    ];
    expect(detectInsiderClusters(txs)).toEqual([]);
  });

  it("scores three insiders higher than two", () => {
    const two = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-15", value: 100_000 }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-16", value: 100_000 }),
    ];
    const three = [
      tx({ symbol: "MSFT", name: "Alice", date: "2026-03-15", value: 100_000 }),
      tx({ symbol: "MSFT", name: "Bob", date: "2026-03-16", value: 100_000 }),
      tx({ symbol: "MSFT", name: "Carol", date: "2026-03-17", value: 100_000 }),
    ];
    const [twoCluster] = detectInsiderClusters(two);
    const [threeCluster] = detectInsiderClusters(three);
    expect(threeCluster.clusterScore).toBeGreaterThan(twoCluster.clusterScore);
  });

  it("handles multiple symbols with separate clusters", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-15" }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-16" }),
      tx({ symbol: "MSFT", name: "Carol", date: "2026-03-15" }),
      tx({ symbol: "MSFT", name: "Dave", date: "2026-03-17" }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(2);
    const symbols = clusters.map((c) => c.symbol).sort();
    expect(symbols).toEqual(["AAPL", "MSFT"]);
  });

  it("scores higher with higher total value", () => {
    const low = [
      tx({ symbol: "LOW", name: "Alice", date: "2026-03-15", value: 10_000 }),
      tx({ symbol: "LOW", name: "Bob", date: "2026-03-16", value: 10_000 }),
    ];
    const high = [
      tx({ symbol: "HIGH", name: "Alice", date: "2026-03-15", value: 500_000 }),
      tx({ symbol: "HIGH", name: "Bob", date: "2026-03-16", value: 500_000 }),
    ];
    const [lowCluster] = detectInsiderClusters(low);
    const allClusters = detectInsiderClusters(high);
    const highCluster = allClusters.find((c) => c.symbol === "HIGH")!;
    expect(highCluster.clusterScore).toBeGreaterThan(lowCluster.clusterScore);
  });

  it("respects custom windowDays", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-01" }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-12" }),
    ];
    // Default 7-day window: no cluster
    expect(detectInsiderClusters(txs, 7)).toEqual([]);
    // 14-day window: cluster detected
    expect(detectInsiderClusters(txs, 14)).toHaveLength(1);
  });

  it("respects custom minInsiders", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-15" }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-16" }),
    ];
    // minInsiders=2: cluster detected
    expect(detectInsiderClusters(txs, 7, 2)).toHaveLength(1);
    // minInsiders=3: no cluster
    expect(detectInsiderClusters(txs, 7, 3)).toEqual([]);
  });

  it("deduplicates overlapping clusters (keeps highest score)", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-10", value: 50_000 }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-12", value: 100_000 }),
      tx({ symbol: "AAPL", name: "Carol", date: "2026-03-14", value: 200_000 }),
    ];
    // Multiple windows overlap; should get exactly one cluster per symbol
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].symbol).toBe("AAPL");
  });

  it("handles Purchase string variant in transactionType", () => {
    const txs = [
      tx({ symbol: "AAPL", name: "Alice", date: "2026-03-15", transactionType: "Purchase" }),
      tx({ symbol: "AAPL", name: "Bob", date: "2026-03-16", transactionType: "P - Purchase" }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
  });
});
