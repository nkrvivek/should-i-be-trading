import { isMarketOpen } from "./marketHours";

const CACHE_TTL_MS = 60_000;

export interface CriDataShape {
  date?: string;
  market_open?: boolean;
}

export function isCriDataStale(
  data: CriDataShape,
  mtimeMs: number,
  todayET: string,
  currentMarketOpen: boolean = isMarketOpen(),
): boolean {
  if (!data.date || data.date !== todayET) return true;

  if (data.market_open === false) {
    return currentMarketOpen ? Date.now() - mtimeMs > CACHE_TTL_MS : false;
  }

  return Date.now() - mtimeMs > CACHE_TTL_MS;
}
