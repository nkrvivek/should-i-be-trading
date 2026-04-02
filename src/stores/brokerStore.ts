import { create } from "zustand";
import type {
  BrokerAccount,
  BrokerPosition,
  BrokerOrder,
  OrderRequest,
  BrokerConnectionInterface,
} from "../lib/brokers/types";
import { createBrokerInstance, BROKER_REGISTRY } from "../lib/brokers/registry";
import { encrypt, decrypt } from "../lib/crypto";

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

const OLD_CREDS_KEY = "sibt_broker_creds";
const OLD_ACTIVE_KEY = "sibt_active_broker";
const CONNECTIONS_KEY = "sibt_broker_connections";
const ENCRYPTED_KEY = "sibt_broker_connections_enc";

interface StoredConnection {
  id: string;
  slug: string;
  credentials: Record<string, string>;
  displayName: string;
}

/** Module-scoped encryption passphrase (no global window leak) */
let _authUid: string | null = null;

/** Get encryption passphrase from the current user session */
function getPassphrase(): string | null {
  return _authUid;
}

/** Set the auth UID for encryption (called from AuthProvider) */
export function setBrokerEncryptionKey(uid: string | null) {
  _authUid = uid;
}

/** Check if encrypted data exists but can't be read (no passphrase yet) */
function hasEncryptedDataPending(): boolean {
  return !getPassphrase() && localStorage.getItem(ENCRYPTED_KEY) !== null;
}

async function loadConnections(): Promise<StoredConnection[]> {
  const passphrase = getPassphrase();

  // Try loading encrypted data first
  if (passphrase) {
    try {
      const encRaw = localStorage.getItem(ENCRYPTED_KEY);
      if (encRaw) {
        const decrypted = await decrypt(encRaw, passphrase);
        return JSON.parse(decrypted);
      }
    } catch { /* decryption failed — fall through to plaintext migration */ }
  }

  // Fall through: load plaintext and migrate to encrypted
  let connections: StoredConnection[] = [];

  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY);
    if (raw) connections = JSON.parse(raw);
  } catch { /* */ }

  if (connections.length === 0) {
    // Migrate from old single-broker format
    try {
      const oldRaw = localStorage.getItem(OLD_CREDS_KEY);
      const oldSlug = localStorage.getItem(OLD_ACTIVE_KEY);
      if (oldRaw && oldSlug) {
        const old = JSON.parse(oldRaw) as { slug: string; credentials: Record<string, string> };
        const info = BROKER_REGISTRY.find((b) => b.slug === old.slug);
        connections = [{
          id: `${old.slug}-migrated`,
          slug: old.slug,
          credentials: old.credentials,
          displayName: info?.name ?? old.slug,
        }];
        // Write migrated data to plaintext key before removing old keys
        localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
        localStorage.removeItem(OLD_CREDS_KEY);
        localStorage.removeItem(OLD_ACTIVE_KEY);
      }
    } catch { /* */ }
  }

  // Migrate plaintext to encrypted storage — only remove plaintext after confirmed write
  if (connections.length > 0 && passphrase) {
    const saved = await saveConnections(connections);
    if (saved) {
      localStorage.removeItem(CONNECTIONS_KEY);
    }
  }

  return connections;
}

/** Returns true if the save succeeded, false on failure */
async function saveConnections(connections: StoredConnection[]): Promise<boolean> {
  const passphrase = getPassphrase();
  try {
    if (passphrase) {
      const encrypted = await encrypt(JSON.stringify(connections), passphrase);
      localStorage.setItem(ENCRYPTED_KEY, encrypted);
      // Only remove plaintext after encrypted write confirmed
      localStorage.removeItem(CONNECTIONS_KEY);
    } else {
      // No auth context yet — store plaintext (will encrypt on next load)
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    }
    return true;
  } catch {
    // Fallback: ensure data is at least saved in plaintext rather than lost
    try {
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    } catch { /* quota exceeded or private mode — nothing we can do */ }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BrokerConnection {
  id: string;
  slug: string;
  displayName: string;
  instance: BrokerConnectionInterface;
}

interface BrokerState {
  connections: BrokerConnection[];
  accounts: Record<string, BrokerAccount>;
  positions: Record<string, BrokerPosition[]>;
  orders: Record<string, BrokerOrder[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  /* Computed aggregates */
  allPositions: () => BrokerPosition[];
  allOrders: () => BrokerOrder[];
  allAccounts: () => BrokerAccount[];

  /* Legacy compat — first connection's data */
  activeBroker: string | null;
  account: BrokerAccount | null;

  /* Actions */
  addConnection: (slug: string, credentials: Record<string, string>, displayName?: string) => Promise<string>;
  removeConnection: (connectionId: string) => Promise<void>;
  refresh: (connectionId?: string) => Promise<void>;
  reconnectAll: () => Promise<void>;
  placeOrder: (connectionId: string, order: OrderRequest) => Promise<BrokerOrder>;
  cancelOrder: (connectionId: string, orderId: string) => Promise<void>;

  /* Legacy compat actions */
  connect: (slug: string, credentials: Record<string, string>) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useBrokerStore = create<BrokerState>((set, get) => {
  /* Helper: fetch data for a single connection */
  async function fetchConnectionData(conn: BrokerConnection) {
    const [account, positions, orders] = await Promise.all([
      conn.instance.getAccount(),
      conn.instance.getPositions(),
      conn.instance.getOrders(),
    ]);
    return { account: { ...account, brokerId: conn.id }, positions, orders };
  }

  /* Helper: derive legacy compat fields from current state */
  function legacyCompat(state: Partial<BrokerState>) {
    const s = { ...get(), ...state };
    const firstConn = s.connections[0];
    return {
      activeBroker: firstConn?.slug ?? null,
      account: firstConn ? (s.accounts[firstConn.id] ?? null) : null,
    };
  }

  return {
    connections: [],
    accounts: {},
    positions: {},
    orders: {},
    loading: {},
    errors: {},

    activeBroker: null,
    account: null,

    /* ---- Computed aggregates ---- */
    allPositions: () => {
      const { connections, positions } = get();
      const merged: BrokerPosition[] = [];
      for (const conn of connections) {
        const connPositions = positions[conn.id] ?? [];
        for (const p of connPositions) {
          merged.push({ ...p, brokerId: conn.id, brokerName: conn.displayName });
        }
      }
      return merged;
    },

    allOrders: () => {
      const { connections, orders } = get();
      const merged: BrokerOrder[] = [];
      for (const conn of connections) {
        const connOrders = orders[conn.id] ?? [];
        for (const o of connOrders) {
          merged.push({ ...o, brokerId: conn.id, brokerName: conn.displayName });
        }
      }
      return merged;
    },

    allAccounts: () => {
      const { connections, accounts } = get();
      return connections.map((c) => accounts[c.id]).filter(Boolean) as BrokerAccount[];
    },

    /* ---- Actions ---- */

    addConnection: async (slug, credentials, displayName) => {
      // Dedup: if a connection with the same slug already exists and uses
      // the same underlying account (e.g. same SnapTrade userId), refresh it
      // instead of creating a duplicate.
      const { connections } = get();
      const allStored = await loadConnections();
      let existing: BrokerConnection | undefined;
      for (const c of connections) {
        if (c.slug !== slug) continue;
        if (slug === "snaptrade" && credentials.snapUserId) {
          const stored = allStored.find((s) => s.id === c.id);
          if (stored?.credentials?.snapUserId === credentials.snapUserId) {
            existing = c;
            break;
          }
        }
      }
      if (existing) {
        // Just refresh the existing connection instead of adding a duplicate
        await get().refresh(existing.id);
        return existing.id;
      }

      const id = `${slug}-${Date.now()}`;
      const instance = createBrokerInstance(slug);
      if (!instance) throw new Error(`Broker ${slug} not available`);

      const info = BROKER_REGISTRY.find((b) => b.slug === slug);
      const name = displayName ?? info?.name ?? slug;

      set((s) => ({
        loading: { ...s.loading, [id]: true },
        errors: { ...s.errors, [id]: null },
      }));

      try {
        await instance.connect(credentials);

        // Use the instance's display name if it discovered the underlying brokerage
        const resolvedName = instance.getDisplayName?.() || name;

        const conn: BrokerConnection = { id, slug, displayName: resolvedName, instance };

        const data = await fetchConnectionData(conn);

        // Save credentials — use updated creds if broker refreshed them (e.g. SnapTrade re-registration)
        const finalCreds = instance.getCredentials?.() ?? credentials;
        const stored = await loadConnections();
        stored.push({ id, slug, credentials: finalCreds, displayName: resolvedName });
        await saveConnections(stored);

        set((s) => {
          const newState = {
            connections: [...s.connections, conn],
            accounts: { ...s.accounts, [id]: data.account },
            positions: { ...s.positions, [id]: data.positions },
            orders: { ...s.orders, [id]: data.orders },
            loading: { ...s.loading, [id]: false },
            errors: { ...s.errors, [id]: null },
          };
          return { ...newState, ...legacyCompat(newState) };
        });

        return id;
      } catch (e) {
        set((s) => ({
          loading: { ...s.loading, [id]: false },
          errors: { ...s.errors, [id]: e instanceof Error ? e.message : "Connection failed" },
        }));
        throw e;
      }
    },

    removeConnection: async (connectionId) => {
      const { connections } = get();
      const conn = connections.find((c) => c.id === connectionId);
      if (conn) {
        conn.instance.disconnect();
      }

      set((s) => {
        const newConns = s.connections.filter((c) => c.id !== connectionId);
        const { [connectionId]: _rmA, ...accounts } = s.accounts;
        const { [connectionId]: _rmP, ...positions } = s.positions;
        const { [connectionId]: _rmO, ...orders } = s.orders;
        const { [connectionId]: _rmL, ...loading } = s.loading;
        const { [connectionId]: _rmE, ...errors } = s.errors;
        const newState = { connections: newConns, accounts, positions, orders, loading, errors };
        return { ...newState, ...legacyCompat(newState) };
      });

      // Update localStorage
      const stored = (await loadConnections()).filter((c) => c.id !== connectionId);
      await saveConnections(stored);
    },

    refresh: async (connectionId) => {
      const { connections } = get();
      const targets = connectionId
        ? connections.filter((c) => c.id === connectionId)
        : connections;

      if (targets.length === 0) return;

      // Set loading
      set((s) => {
        const loading = { ...s.loading };
        for (const t of targets) loading[t.id] = true;
        return { loading };
      });

      await Promise.allSettled(
        targets.map(async (conn) => {
          try {
            // If not connected, try reconnecting
            if (!conn.instance.isConnected) {
              const stored = (await loadConnections()).find((c) => c.id === conn.id);
              await conn.instance.connect(stored?.credentials ?? {});
            }

            const data = await fetchConnectionData(conn);
            set((s) => {
              const newState = {
                accounts: { ...s.accounts, [conn.id]: data.account },
                positions: { ...s.positions, [conn.id]: data.positions },
                orders: { ...s.orders, [conn.id]: data.orders },
                loading: { ...s.loading, [conn.id]: false },
                errors: { ...s.errors, [conn.id]: null },
              };
              return { ...newState, ...legacyCompat(newState) };
            });
          } catch (e) {
            set((s) => ({
              loading: { ...s.loading, [conn.id]: false },
              errors: { ...s.errors, [conn.id]: e instanceof Error ? e.message : "Refresh failed" },
            }));
          }
        }),
      );
    },

    reconnectAll: async () => {
      // If encrypted data exists but auth hasn't set the passphrase yet,
      // wait briefly for it (AuthProvider runs async getSession on mount)
      if (hasEncryptedDataPending()) {
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const check = () => {
            if (!hasEncryptedDataPending() || ++attempts > 20) resolve();
            else setTimeout(check, 150);
          };
          check();
        });
      }

      const stored = await loadConnections();
      if (stored.length === 0) return;

      // Deduplicate stored connections — keep first entry per slug+account key
      const seen = new Set<string>();
      const deduped: typeof stored = [];
      for (const entry of stored) {
        const key = entry.slug === "snaptrade" && entry.credentials?.snapUserId
          ? `${entry.slug}:${entry.credentials.snapUserId}`
          : entry.id;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(entry);
      }
      // Persist cleaned list if duplicates were removed
      if (deduped.length < stored.length) {
        await saveConnections(deduped);
      }

      await Promise.allSettled(
        deduped.map(async (entry) => {
          // Skip if already connected
          const existing = get().connections.find((c) => c.id === entry.id);
          if (existing?.instance.isConnected) return;

          const instance = existing?.instance ?? createBrokerInstance(entry.slug);
          if (!instance) return;

          set((s) => ({
            loading: { ...s.loading, [entry.id]: true },
            errors: { ...s.errors, [entry.id]: null },
          }));

          try {
            await instance.connect(entry.credentials);

            // Use the instance's display name if it discovered the underlying brokerage
            const resolvedName = instance.getDisplayName?.() || entry.displayName;

            const conn: BrokerConnection = {
              id: entry.id,
              slug: entry.slug,
              displayName: resolvedName,
              instance,
            };

            const data = await fetchConnectionData(conn);

            // Persist refreshed credentials and display name
            const refreshedCreds = instance.getCredentials?.() ?? entry.credentials;
            const currentStored = await loadConnections();
            const idx = currentStored.findIndex((c) => c.id === entry.id);
            if (idx >= 0) {
              currentStored[idx].credentials = refreshedCreds;
              currentStored[idx].displayName = resolvedName;
              await saveConnections(currentStored);
            }

            set((s) => {
              const alreadyExists = s.connections.some((c) => c.id === entry.id);
              const newConns = alreadyExists
                ? s.connections.map((c) => (c.id === entry.id ? conn : c))
                : [...s.connections, conn];
              const newState = {
                connections: newConns,
                accounts: { ...s.accounts, [entry.id]: data.account },
                positions: { ...s.positions, [entry.id]: data.positions },
                orders: { ...s.orders, [entry.id]: data.orders },
                loading: { ...s.loading, [entry.id]: false },
                errors: { ...s.errors, [entry.id]: null },
              };
              return { ...newState, ...legacyCompat(newState) };
            });
          } catch (e) {
            // If instance was newly created (not existing), still track it so it can be retried
            if (!existing) {
              const conn: BrokerConnection = {
                id: entry.id,
                slug: entry.slug,
                displayName: entry.displayName,
                instance,
              };
              set((s) => {
                const alreadyExists = s.connections.some((c) => c.id === entry.id);
                return {
                  connections: alreadyExists ? s.connections : [...s.connections, conn],
                  loading: { ...s.loading, [entry.id]: false },
                  errors: { ...s.errors, [entry.id]: e instanceof Error ? e.message : "Reconnection failed" },
                };
              });
            } else {
              set((s) => ({
                loading: { ...s.loading, [entry.id]: false },
                errors: { ...s.errors, [entry.id]: e instanceof Error ? e.message : "Reconnection failed" },
              }));
            }
          }
        }),
      );
    },

    placeOrder: async (connectionId, order) => {
      const { connections } = get();
      const conn = connections.find((c) => c.id === connectionId);
      if (!conn) throw new Error("Connection not found");
      if (!conn.instance.isConnected) throw new Error("Broker not connected");

      const result = await conn.instance.placeOrder(order);
      const orders = await conn.instance.getOrders();
      set((s) => ({ orders: { ...s.orders, [connectionId]: orders } }));
      return result;
    },

    cancelOrder: async (connectionId, orderId) => {
      const { connections } = get();
      const conn = connections.find((c) => c.id === connectionId);
      if (!conn) throw new Error("Connection not found");
      if (!conn.instance.isConnected) throw new Error("Broker not connected");

      await conn.instance.cancelOrder(orderId);
      const orders = await conn.instance.getOrders();
      set((s) => ({ orders: { ...s.orders, [connectionId]: orders } }));
    },

    /* ---- Legacy compat ---- */

    connect: async (slug, credentials) => {
      // Legacy: adds a new connection (or reconnects the first one with the same slug)
      const { connections } = get();
      const existing = connections.find((c) => c.slug === slug);
      if (existing) {
        // Reconnect existing
        await get().refresh(existing.id);
        return;
      }
      await get().addConnection(slug, credentials);
    },

    disconnect: () => {
      const { connections, removeConnection } = get();
      if (connections.length > 0) {
        removeConnection(connections[0].id);
      }
    },

    reconnect: async () => {
      await get().reconnectAll();
    },
  };
});
