import { useEffect, useMemo, useRef, useState } from "react";
import { searchSymbol } from "../../api/fmpClient";
import { getCachedCompanyInfo } from "../../lib/companyInfo";
import { isSupabaseConfigured } from "../../lib/supabase";

export type TickerPickerOption = {
  symbol: string;
  name?: string;
  hint?: string;
};

type PickerSuggestion = TickerPickerOption & {
  key: string;
};

function normalizeSymbolInput(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

function isTickerLike(value: string): boolean {
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(value);
}

export function TickerPicker({
  value,
  onSelect,
  options = [],
  placeholder = "Search ticker or company name...",
}: {
  value: string;
  onSelect: (symbol: string) => void;
  options?: TickerPickerOption[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [remoteOptions, setRemoteOptions] = useState<TickerPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasLiveSearch = isSupabaseConfigured();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!hasLiveSearch || trimmed.length < 2) {
      setRemoteOptions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchSymbol(trimmed, 8)
        .then((results) => {
          if (cancelled) return;
          setRemoteOptions(
            results
              .filter((item) => item.symbol?.trim())
              .map((item) => ({
                symbol: item.symbol.trim().toUpperCase(),
                name: item.name?.trim() || undefined,
                hint: item.exchangeShortName?.trim() || undefined,
              })),
          );
        })
        .catch((err) => {
          if (cancelled) return;
          setRemoteOptions([]);
          setError(err instanceof Error ? err.message : "Ticker search failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [hasLiveSearch, query]);

  const localOptions = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    return options
      .map((option) => {
        const symbol = normalizeSymbolInput(option.symbol);
        if (!symbol) return null;
        const cachedName = getCachedCompanyInfo(symbol)?.name;
        const name = option.name || cachedName || undefined;
        if (!loweredQuery) {
          return { symbol, name, hint: option.hint };
        }

        const haystack = `${symbol} ${name ?? ""} ${option.hint ?? ""}`.toLowerCase();
        if (!haystack.includes(loweredQuery)) return null;
        return { symbol, name, hint: option.hint };
      })
      .filter((option): option is NonNullable<typeof option> => option !== null);
  }, [options, query]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const combined: PickerSuggestion[] = [];
    const normalizedQuery = normalizeSymbolInput(query);
    const hasExactMatch = [...localOptions, ...remoteOptions].some(
      (option) => normalizeSymbolInput(option.symbol) === normalizedQuery,
    );

    const push = (option: TickerPickerOption | null, key: string) => {
      if (!option) return;
      const symbol = normalizeSymbolInput(option.symbol);
      if (!symbol || seen.has(symbol)) return;
      seen.add(symbol);
      combined.push({
        symbol,
        name: option.name,
        hint: option.hint,
        key,
      });
    };

    if (normalizedQuery && isTickerLike(normalizedQuery) && !hasExactMatch) {
      push(
        {
          symbol: normalizedQuery,
          hint: "Use typed ticker",
        },
        `typed:${normalizedQuery}`,
      );
    }

    localOptions.forEach((option, index) => push(option, `local:${option.symbol}:${index}`));
    remoteOptions.forEach((option, index) => push(option, `remote:${option.symbol}:${index}`));

    return combined.slice(0, 10);
  }, [localOptions, query, remoteOptions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  const selectSuggestion = (symbol: string) => {
    const normalized = normalizeSymbolInput(symbol);
    if (!normalized) return;
    setQuery(normalized);
    setOpen(false);
    setError(null);
    onSelect(normalized);
  };

  const handleSubmit = () => {
    const normalized = normalizeSymbolInput(query);
    if (!normalized) return;
    if (suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex].symbol);
      return;
    }
    selectSuggestion(normalized);
  };

  const helperText = !hasLiveSearch
    ? "Company search is unavailable here, but you can still enter any ticker directly."
    : "Search by ticker or company name, then keep the same symbol through chat, research, and fundamentals.";

  return (
    <div ref={containerRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--signal-core)" }}>
        TICKER PICKER
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", minWidth: 0 }}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(suggestions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid var(--border-dim)",
            background: "var(--bg-panel-raised)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!normalizeSymbolInput(query)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            padding: "0 14px",
            borderRadius: 6,
            border: "1px solid var(--signal-core)",
            background: "rgba(5, 173, 152, 0.12)",
            color: "var(--signal-core)",
            cursor: normalizeSymbolInput(query) ? "pointer" : "not-allowed",
            opacity: normalizeSymbolInput(query) ? 1 : 0.5,
            whiteSpace: "nowrap",
          }}
        >
          OPEN
        </button>
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {helperText}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            padding: 6,
            borderRadius: 8,
            border: "1px solid var(--border-dim)",
            background: "var(--bg-panel)",
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.18)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={suggestion.key}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion.symbol);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  textAlign: "left",
                  padding: "9px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: active ? "rgba(5, 173, 152, 0.10)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {suggestion.symbol}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {suggestion.name || "Open ticker workspace"}
                  </span>
                </span>
                {suggestion.hint && (
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 999,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}>
                    {suggestion.hint}
                  </span>
                )}
              </button>
            );
          })}

          {loading && (
            <div style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              Searching tickers...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              {normalizeSymbolInput(query)
                ? "Press Enter to open the typed ticker."
                : "Start typing a ticker or company name."}
            </div>
          )}

          {error && (
            <div style={{ padding: "4px 10px 8px", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--warning)" }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
