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

  it("very large value cluster → high score", () => {
    const txs = [
      tx({ symbol: "MEGA", name: "Alice", date: "2026-03-15", value: 5_000_000 }),
      tx({ symbol: "MEGA", name: "Bob", date: "2026-03-16", value: 5_000_000 }),
      tx({ symbol: "MEGA", name: "Carol", date: "2026-03-17", value: 5_000_000 }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
    // Score should be capped at 100 given 3 insiders * 20 + huge value + tightness bonus
    expect(clusters[0].clusterScore).toBe(100);
    expect(clusters[0].totalValue).toBe(15_000_000);
  });

  it("cluster with tightness = 0 (all same day) → maximum tightness bonus", () => {
    const txs = [
      tx({ symbol: "TIGHT", name: "Alice", date: "2026-03-15", value: 100_000 }),
      tx({ symbol: "TIGHT", name: "Bob", date: "2026-03-15", value: 100_000 }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
    // daysBetween = 0, so tightness = 1 - 0/7 = 1 → max tightness bonus of 15
    // Score = 2 * 20 + (200_000 / 100_000) * 10 + 1 * 15 = 40 + 20 + 15 = 75
    expect(clusters[0].clusterScore).toBe(75);
    expect(clusters[0].dateRange.start).toBe("2026-03-15");
    expect(clusters[0].dateRange.end).toBe("2026-03-15");
  });

  it("mixed buy and sell transactions → only purchases form clusters", () => {
    const txs = [
      tx({ symbol: "MIX", name: "Alice", date: "2026-03-15", transactionType: "P", value: 200_000 }),
      tx({ symbol: "MIX", name: "Bob", date: "2026-03-16", transactionType: "S", value: 500_000 }),
      tx({ symbol: "MIX", name: "Carol", date: "2026-03-17", transactionType: "P", value: 150_000 }),
    ];
    const clusters = detectInsiderClusters(txs);
    expect(clusters).toHaveLength(1);
    // Only Alice and Carol (purchases) should form the cluster
    expect(clusters[0].insiders).toHaveLength(2);
    const names = clusters[0].insiders.map((i) => i.name).sort();
    expect(names).toEqual(["Alice", "Carol"]);
    // Bob's sell transaction should not be counted in totalValue
    expect(clusters[0].totalValue).toBe(350_000);
  });
});
