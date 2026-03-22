/** ET timezone market hours logic */

export type MarketStatus = "PRE_MARKET" | "OPEN" | "AFTER_HOURS" | "CLOSED";

export function getETDate(now: Date = new Date()): Date {
  return new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export function getTodayET(now: Date = new Date()): string {
  const et = getETDate(now);
  const y = et.getFullYear();
  const m = String(et.getMonth() + 1).padStart(2, "0");
  const d = String(et.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWeekday(now: Date = new Date()): boolean {
  const et = getETDate(now);
  const day = et.getDay();
  return day >= 1 && day <= 5;
}

export function getMinutesSinceMidnightET(now: Date = new Date()): number {
  const et = getETDate(now);
  return et.getHours() * 60 + et.getMinutes();
}

const MARKET_OPEN_MINUTES = 9 * 60 + 30; // 9:30 AM
const MARKET_CLOSE_MINUTES = 16 * 60;     // 4:00 PM
const PRE_MARKET_MINUTES = 4 * 60;        // 4:00 AM
const AFTER_HOURS_END = 20 * 60;          // 8:00 PM

export function isMarketOpen(now: Date = new Date()): boolean {
  if (!isWeekday(now)) return false;
  const minutes = getMinutesSinceMidnightET(now);
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  if (!isWeekday(now)) return "CLOSED";
  const minutes = getMinutesSinceMidnightET(now);

  if (minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES) return "OPEN";
  if (minutes >= PRE_MARKET_MINUTES && minutes < MARKET_OPEN_MINUTES) return "PRE_MARKET";
  if (minutes > MARKET_CLOSE_MINUTES && minutes <= AFTER_HOURS_END) return "AFTER_HOURS";
  return "CLOSED";
}

export function formatETTime(now: Date = new Date()): string {
  const et = getETDate(now);
  return et.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
