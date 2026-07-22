import { describe, it, expect } from "vitest";
import { buildDefaultExecutionSettingsRow } from "../../src/lib/executionSettingsDefaults";

describe("buildDefaultExecutionSettingsRow", () => {
  it("stamps the given user id onto the row", () => {
    const row = buildDefaultExecutionSettingsRow("user-123");
    expect(row.user_id).toBe("user-123");
  });

  it("defaults auto_execute_enabled and kill_switch to false", () => {
    const row = buildDefaultExecutionSettingsRow("user-123");
    expect(row.auto_execute_enabled).toBe(false);
    expect(row.kill_switch).toBe(false);
  });

  it("defaults both caps to zero", () => {
    const row = buildDefaultExecutionSettingsRow("user-123");
    expect(row.auto_max_notional_usd).toBe(0);
    expect(row.auto_max_trades_per_day).toBe(0);
  });

  it("produces a fresh object on every call rather than a shared mutable default", () => {
    const a = buildDefaultExecutionSettingsRow("user-1");
    const b = buildDefaultExecutionSettingsRow("user-2");
    expect(a).not.toBe(b);
    expect(a.user_id).toBe("user-1");
    expect(b.user_id).toBe("user-2");
  });
});
