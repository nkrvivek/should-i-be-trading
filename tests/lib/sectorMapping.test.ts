import { describe, expect, it } from "vitest";
import { getSectorEtfForSymbol, getSectorForSymbol, SECTOR_MAP } from "../../src/lib/sectorMapping";

describe("sectorMapping", () => {
  it("tracks a 250-symbol universe", () => {
    expect(Object.keys(SECTOR_MAP)).toHaveLength(250);
  });

  it("returns sector and ETF lookups for known symbols", () => {
    expect(getSectorForSymbol("AAPL")).toBe("Technology");
    expect(getSectorEtfForSymbol("AAPL")).toBe("XLK");
    expect(getSectorForSymbol("JPM")).toBe("Financials");
    expect(getSectorEtfForSymbol("JPM")).toBe("XLF");
    expect(getSectorEtfForSymbol("unknown")).toBeNull();
  });
});
