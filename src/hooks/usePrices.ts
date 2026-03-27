import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type WSMessage,
  type PriceData,
  type FundamentalsData,
  type OptionContract,
  type IndexContract,
  normalizeSymbolList,
  uniqueOptionContracts,
  symbolKey,
  contractsKey,
  optionKey,
} from "../api/types";
import { createReconnectStrategy, type ReconnectState } from "../lib/reconnectStrategy";

export type PriceUpdate = {
  symbol: string;
  data: PriceData;
  receivedAt: Date;
};

export type UsePricesOptions = {
  symbols: string[];
  contracts?: OptionContract[];
  indexes?: IndexContract[];
  enabled?: boolean;
  onPriceUpdate?: (update: PriceUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export type UsePricesReturn = {
  prices: Record<string, PriceData>;
  fundamentals: Record<string, FundamentalsData>;
  connected: boolean;
  ibConnected: boolean;
  ibIssue: string | null;
  ibStatusMessage: string | null;
  error: string | null;
  reconnect: () => void;
  getSnapshot: (symbols: string[]) => Promise<Record<string, PriceData>>;
};

type ConnState = "idle" | "connecting" | "open" | "closed";

import { getWsUrl } from "../lib/connectionConfig";

const STALENESS_CHECK_MS = 15_000;
const STALENESS_THRESHOLD_MS = 60_000;

export function usePrices(options: UsePricesOptions): UsePricesReturn {
  const {
    symbols,
    contracts = [],
    indexes = [],
    enabled = true,
    onPriceUpdate,
    onConnectionChange,
  } = options;

  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [fundamentals, setFundamentals] = useState<Record<string, FundamentalsData>>({});
  const [connected, setConnected] = useState(false);
  const [ibConnected, setIbConnected] = useState(false);
  const [ibIssue, setIbIssue] = useState<string | null>(null);
  const [ibStatusMessage, setIbStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalenessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageRef = useRef<number>(Date.now()); // eslint-disable-line react-hooks/purity
  const mountedRef = useRef(true);
  const connStateRef = useRef<ConnState>("idle");
  const socketGenRef = useRef(0);
  const reconnectStrategyRef = useRef<ReconnectState>(createReconnectStrategy());

  const desiredRef = useRef<{
    symbols: string[];
    contracts: OptionContract[];
    indexes: IndexContract[];
  }>({ symbols: [], contracts: [], indexes: [] });
  const lastSentHashRef = useRef("");

  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  const symbolHash = symbolKey(symbols);
  const contractHash = contractsKey(contracts);
  const indexHash = useMemo(
    () => indexes.map((i) => `${i.symbol}@${i.exchange}`).sort().join(","),
    [indexes],
  );
  const normalizedSymbols = useMemo(() => normalizeSymbolList(symbols), [symbolHash]); // eslint-disable-line react-hooks/exhaustive-deps
  const normalizedContracts = useMemo(() => uniqueOptionContracts(contracts), [contractHash]); // eslint-disable-line react-hooks/exhaustive-deps
  const normalizedIndexes = useMemo(() => indexes, [indexHash]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSubscriptions =
    normalizedSymbols.length > 0 ||
    normalizedContracts.length > 0 ||
    normalizedIndexes.length > 0;

  desiredRef.current = {
    symbols: normalizedSymbols,
    contracts: normalizedContracts,
    indexes: normalizedIndexes,
  };
  onPriceUpdateRef.current = onPriceUpdate;
  onConnectionChangeRef.current = onConnectionChange;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearStalenessTimer = useCallback(() => {
    if (stalenessTimerRef.current) {
      clearInterval(stalenessTimerRef.current);
      stalenessTimerRef.current = null;
    }
  }, []);

  const buildHash = useCallback(
    (syms: string[], cts: OptionContract[], idxs: IndexContract[]) =>
      symbolKey(syms) + "|" + contractsKey(cts) + "|" +
      idxs.map((i) => `${i.symbol}@${i.exchange}`).sort().join(","),
    [],
  );

  const syncSubscriptions = useCallback(
    (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const desired = desiredRef.current;
      const currentHash = buildHash(desired.symbols, desired.contracts, desired.indexes);
      if (currentHash === lastSentHashRef.current) return;

      const [lastSyms = "", lastCts = "", lastIdxs = ""] = lastSentHashRef.current.split("|");
      const prevSymbolSet = new Set(lastSyms.split(",").filter(Boolean));
      const prevContractSet = new Set(lastCts.split(",").filter(Boolean));
      const prevIndexSet = new Set(lastIdxs.split(",").filter(Boolean));

      const currSymbolSet = new Set(desired.symbols);
      const currContractSet = new Set(desired.contracts.map(optionKey));
      const currIndexPairs = desired.indexes.map((idx) => `${idx.symbol}@${idx.exchange}`).sort();
      const currIndexSet = new Set(currIndexPairs);

      const addedSymbols = desired.symbols.filter((s) => !prevSymbolSet.has(s));
      const addedContracts = desired.contracts.filter((c) => !prevContractSet.has(optionKey(c)));
      const addedIndexes = desired.indexes.filter((idx) => !prevIndexSet.has(`${idx.symbol}@${idx.exchange}`));

      const removedSymbols = [...prevSymbolSet].filter((s) => !currSymbolSet.has(s));
      const removedContractKeys = [...prevContractSet].filter((k) => !currContractSet.has(k));
      const removedIndexKeys = [...prevIndexSet].filter((k) => !currIndexSet.has(k));
      const removedIndexSymbols = [...new Set(removedIndexKeys.map((k) => k.split("@")[0]))];

      if (addedSymbols.length > 0 || addedContracts.length > 0 || addedIndexes.length > 0) {
        ws.send(JSON.stringify({
          action: "subscribe",
          symbols: addedSymbols,
          ...(addedContracts.length > 0 ? { contracts: addedContracts } : {}),
          ...(addedIndexes.length > 0 ? { indexes: addedIndexes } : {}),
        }));
      }

      if (removedSymbols.length > 0 || removedContractKeys.length > 0 || removedIndexSymbols.length > 0) {
        ws.send(JSON.stringify({
          action: "unsubscribe",
          symbols: [...removedSymbols, ...removedContractKeys, ...removedIndexSymbols],
        }));
        setPrices((prev) => {
          const next = { ...prev };
          for (const k of [...removedSymbols, ...removedContractKeys, ...removedIndexSymbols]) {
            delete next[k];
          }
          return next;
        });
      }

      lastSentHashRef.current = currentHash;
    },
    [buildHash],
  );

  const scheduleReconnectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!enabled) return;
    const { symbols: syms, contracts: cts, indexes: idxs } = desiredRef.current;
    if (syms.length === 0 && cts.length === 0 && idxs.length === 0) return;
    if (connStateRef.current === "connecting" || connStateRef.current === "open") return;

    clearReconnectTimer();
    const gen = ++socketGenRef.current;
    connStateRef.current = "connecting";

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (gen !== socketGenRef.current || !mountedRef.current) return;
      connStateRef.current = "open";
      reconnectStrategyRef.current.reset();
      lastMessageRef.current = Date.now();
      setConnected(true);
      setError(null);
      onConnectionChangeRef.current?.(true);
      lastSentHashRef.current = "";
      syncSubscriptions(ws);

      clearStalenessTimer();
      stalenessTimerRef.current = setInterval(() => {
        if (Date.now() - lastMessageRef.current > STALENESS_THRESHOLD_MS) {
          ws.close();
        }
      }, STALENESS_CHECK_MS);
    };

    ws.onmessage = (event) => {
      if (gen !== socketGenRef.current || !mountedRef.current) return;
      lastMessageRef.current = Date.now();
      try {
        const message = JSON.parse(event.data as string) as WSMessage;
        switch (message.type) {
          case "price":
          case "snapshot": {
            const { data } = message;
            setPrices((prev) => ({ ...prev, [data.symbol]: data }));
            onPriceUpdateRef.current?.({ symbol: data.symbol, data, receivedAt: new Date() });
            break;
          }
          case "batch": {
            const { updates } = message;
            setPrices((prev) => ({ ...prev, ...updates }));
            const now = new Date();
            for (const [sym, data] of Object.entries(updates)) {
              onPriceUpdateRef.current?.({ symbol: sym, data, receivedAt: now });
            }
            break;
          }
          case "fundamentals":
            setFundamentals((prev) => ({ ...prev, [message.symbol]: message.data }));
            break;
          case "status":
            setIbConnected(message.ib_connected);
            setIbIssue(message.ib_issue ?? null);
            setIbStatusMessage(message.ib_status_message ?? null);
            break;
          case "error":
            setError(message.message);
            break;
          case "ping":
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: "pong" }));
            }
            break;
          default:
            break;
        }
      } catch (e) {
        console.error("Failed to parse price message:", e);
      }
    };

    ws.onclose = () => {
      if (gen !== socketGenRef.current || !mountedRef.current) return;
      connStateRef.current = "closed";
      clearStalenessTimer();
      setConnected(false);
      setIbIssue(null);
      setIbStatusMessage(null);
      onConnectionChangeRef.current?.(false);
      lastSentHashRef.current = "";
      scheduleReconnectRef.current();
    };

    ws.onerror = () => {
      if (gen !== socketGenRef.current || !mountedRef.current) return;
      connStateRef.current = "closed";
      setConnected(false);
      setError("Connection lost");
      onConnectionChangeRef.current?.(false);
      ws.close();
    };
  }, [enabled, clearReconnectTimer, clearStalenessTimer, syncSubscriptions]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;
    const { symbols: syms, contracts: cts, indexes: idxs } = desiredRef.current;
    if (syms.length === 0 && cts.length === 0 && idxs.length === 0) return;

    const strategy = reconnectStrategyRef.current;
    if (!strategy.canRetry()) {
      setError("Max reconnect attempts reached");
      return;
    }

    const delay = strategy.nextDelay();
    clearReconnectTimer();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && enabled) {
        connStateRef.current = "idle";
        connect();
      }
    }, delay);
  }, [enabled, clearReconnectTimer, connect]);

  scheduleReconnectRef.current = scheduleReconnect;

  const reconnect = useCallback(() => {
    connStateRef.current = "idle";
    reconnectStrategyRef.current.reset();
    connect();
  }, [connect]);

  const getSnapshot = useCallback(
    async (snapshotSymbols: string[]): Promise<Record<string, PriceData>> => {
      const symbolsToRequest = normalizeSymbolList(snapshotSymbols);
      if (symbolsToRequest.length === 0) return {};

      return new Promise<Record<string, PriceData>>((resolve, reject) => {
        const ws = new WebSocket(getWsUrl());
        const results: Record<string, PriceData> = {};
        const pending = new Set(symbolsToRequest);

        const timeout = setTimeout(() => { ws.close(); resolve(results); }, 5000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ action: "snapshot", symbols: symbolsToRequest }));
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as WSMessage;
            if (msg.type === "snapshot") {
              results[msg.data.symbol.toUpperCase()] = msg.data;
              pending.delete(msg.data.symbol.toUpperCase());
              if (pending.size === 0) { clearTimeout(timeout); ws.close(); resolve(results); }
            } else if (msg.type === "error") {
              clearTimeout(timeout); ws.close(); reject(new Error(msg.message));
            }
          } catch (e) { console.error("Snapshot parse error:", e); }
        };
        ws.onerror = () => { clearTimeout(timeout); ws.close(); reject(new Error("WS connection failed")); };
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Snapshot failed");
        return {};
      });
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && hasSubscriptions) {
      connect();
    } else {
      clearReconnectTimer();
      clearStalenessTimer();
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
        wsRef.current = null;
      }
      connStateRef.current = "idle";
      lastSentHashRef.current = "";
      setConnected(false);
      onConnectionChangeRef.current?.(false);
    }
    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      clearStalenessTimer();
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
        wsRef.current = null;
      }
      connStateRef.current = "idle";
      lastSentHashRef.current = "";
    };
  }, [enabled, hasSubscriptions, connect, clearReconnectTimer, clearStalenessTimer]);

  useEffect(() => {
    const ws = wsRef.current;
    if (ws && connStateRef.current === "open") syncSubscriptions(ws);
  }, [symbolHash, contractHash, indexHash, syncSubscriptions]);

  return { prices, fundamentals, connected, ibConnected, ibIssue, ibStatusMessage, error, reconnect, getSnapshot };
}
