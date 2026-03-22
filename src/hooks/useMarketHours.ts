import { useEffect, useState } from "react";
import { getMarketStatus, isMarketOpen, formatETTime, type MarketStatus } from "../lib/marketHours";

export type MarketHoursState = {
  isOpen: boolean;
  status: MarketStatus;
  etTime: string;
};

export function useMarketHours(intervalMs = 30_000): MarketHoursState {
  const [state, setState] = useState<MarketHoursState>(() => ({
    isOpen: isMarketOpen(),
    status: getMarketStatus(),
    etTime: formatETTime(),
  }));

  useEffect(() => {
    const update = () => {
      setState({
        isOpen: isMarketOpen(),
        status: getMarketStatus(),
        etTime: formatETTime(),
      });
    };

    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return state;
}
