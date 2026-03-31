import { useState, useCallback } from "react";
import { Panel } from "../layout/Panel";
import { useWatchlists } from "../../hooks/useWatchlists";
import { TradeVerdictBadgeWithScore } from "../trading/TradeVerdictBadge";

export function WatchlistManager() {
  const {
    watchlists, activeWatchlist, activeId, setActiveId,
    createWatchlist, updateWatchlist, deleteWatchlist,
  } = useWatchlists();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [addTicker, setAddTicker] = useState("");

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createWatchlist(name, []);
    setNewName("");
    setShowCreate(false);
  }, [newName, createWatchlist]);

  const handleAddTicker = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = addTicker.trim().toUpperCase();
    if (!ticker || !activeWatchlist) return;
    if (activeWatchlist.tickers.includes(ticker)) {
      setAddTicker("");
      return;
    }
    await updateWatchlist(activeWatchlist.id, {
      tickers: [...activeWatchlist.tickers, ticker],
    });
    setAddTicker("");
  }, [addTicker, activeWatchlist, updateWatchlist]);

  const handleRemoveTicker = useCallback(async (ticker: string) => {
    if (!activeWatchlist) return;
    await updateWatchlist(activeWatchlist.id, {
      tickers: activeWatchlist.tickers.filter((t) => t !== ticker),
    });
  }, [activeWatchlist, updateWatchlist]);

  return (
    <Panel title="Watchlists">
      {/* Watchlist tabs */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
        {watchlists.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveId(w.id)}
            style={{
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: w.id === activeId ? 600 : 400,
              color: w.id === activeId ? "var(--signal-core)" : "var(--text-muted)",
              background: w.id === activeId ? "rgba(5, 173, 152, 0.1)" : "transparent",
              border: `1px solid ${w.id === activeId ? "var(--signal-core)" : "var(--border-dim)"}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {w.name} ({w.tickers.length})
          </button>
        ))}
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 12,
            color: "var(--text-muted)", background: "transparent",
            border: "1px dashed var(--border-dim)", borderRadius: 4, cursor: "pointer",
          }}
        >
          + NEW
        </button>
      </div>

      {/* Create watchlist form */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Watchlist name"
            autoFocus
            style={inputStyle}
          />
          <button type="submit" disabled={!newName.trim()} style={btnStyle(!newName.trim())}>
            CREATE
          </button>
          <button type="button" onClick={() => setShowCreate(false)} style={cancelBtnStyle}>
            CANCEL
          </button>
        </form>
      )}

      {/* Add ticker form */}
      {activeWatchlist && (
        <form onSubmit={handleAddTicker} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={addTicker}
            onChange={(e) => setAddTicker(e.target.value.toUpperCase())}
            placeholder="Add ticker (e.g. AAPL)"
            style={inputStyle}
          />
          <button type="submit" disabled={!addTicker.trim()} style={btnStyle(!addTicker.trim())}>
            ADD
          </button>
        </form>
      )}

      {/* Ticker grid */}
      {activeWatchlist && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {activeWatchlist.tickers.map((ticker) => (
            <div
              key={ticker}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 8px", background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)", borderRadius: 4,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {ticker}
              </span>
              <TradeVerdictBadgeWithScore symbol={ticker} showScore={false} />
              <button
                onClick={() => handleRemoveTicker(ticker)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-muted)",
                  padding: "0 2px", lineHeight: 1,
                }}
                title="Remove ticker"
              >
                ×
              </button>
            </div>
          ))}
          {activeWatchlist.tickers.length === 0 && (
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
              No tickers yet. Add some above.
            </div>
          )}
        </div>
      )}

      {/* Delete non-default watchlist */}
      {activeWatchlist && !activeWatchlist.is_default && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-dim)" }}>
          <button
            onClick={() => deleteWatchlist(activeWatchlist.id)}
            style={{
              background: "none", border: "1px solid var(--negative)",
              borderRadius: 4, padding: "4px 12px", fontFamily: "var(--font-mono)",
              fontSize: 12, color: "var(--negative)", cursor: "pointer",
            }}
          >
            DELETE "{activeWatchlist.name}"
          </button>
        </div>
      )}
    </Panel>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: "6px 10px",
  background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
  borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 14,
  color: "var(--text-primary)", outline: "none",
};

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 14px", background: "var(--signal-core)",
    color: "#000", border: "none", borderRadius: 4,
    fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

const cancelBtnStyle: React.CSSProperties = {
  padding: "6px 12px", background: "none",
  border: "1px solid var(--border-dim)", borderRadius: 4,
  fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)",
  cursor: "pointer",
};
