import { create } from "zustand";
import type { BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest } from "../lib/brokers/types";
import { getBrokerInstance, getActiveBrokerSlug, setActiveBrokerSlug } from "../lib/brokers/registry";

interface BrokerState {
  activeBroker: string | null;
  account: BrokerAccount | null;
  positions: BrokerPosition[];
  orders: BrokerOrder[];
  loading: boolean;
  error: string | null;

  setActiveBroker: (slug: string | null) => void;
  connect: (slug: string, credentials: Record<string, string>) => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  placeOrder: (order: OrderRequest) => Promise<BrokerOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
}

export const useBrokerStore = create<BrokerState>((set, get) => ({
  activeBroker: getActiveBrokerSlug(),
  account: null,
  positions: [],
  orders: [],
  loading: false,
  error: null,

  setActiveBroker: (slug) => {
    setActiveBrokerSlug(slug);
    set({ activeBroker: slug, account: null, positions: [], orders: [], error: null });
  },

  connect: async (slug, credentials) => {
    set({ loading: true, error: null });
    try {
      const broker = getBrokerInstance(slug);
      if (!broker) throw new Error(`Broker ${slug} not available`);
      await broker.connect(credentials);
      setActiveBrokerSlug(slug);

      const [account, positions, orders] = await Promise.all([
        broker.getAccount(),
        broker.getPositions(),
        broker.getOrders(),
      ]);

      set({ activeBroker: slug, account, positions, orders, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Connection failed" });
      throw e;
    }
  },

  disconnect: () => {
    const { activeBroker } = get();
    if (activeBroker) {
      const broker = getBrokerInstance(activeBroker);
      broker?.disconnect();
    }
    setActiveBrokerSlug(null);
    set({ activeBroker: null, account: null, positions: [], orders: [], error: null });
  },

  refresh: async () => {
    const { activeBroker } = get();
    if (!activeBroker) return;
    const broker = getBrokerInstance(activeBroker);
    if (!broker?.isConnected) return;

    set({ loading: true });
    try {
      const [account, positions, orders] = await Promise.all([
        broker.getAccount(),
        broker.getPositions(),
        broker.getOrders(),
      ]);
      set({ account, positions, orders, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Refresh failed" });
    }
  },

  placeOrder: async (order) => {
    const { activeBroker } = get();
    if (!activeBroker) throw new Error("No broker connected");
    const broker = getBrokerInstance(activeBroker);
    if (!broker?.isConnected) throw new Error("Broker not connected");

    const result = await broker.placeOrder(order);
    // Refresh orders after placing
    const orders = await broker.getOrders();
    set({ orders });
    return result;
  },

  cancelOrder: async (orderId) => {
    const { activeBroker } = get();
    if (!activeBroker) throw new Error("No broker connected");
    const broker = getBrokerInstance(activeBroker);
    if (!broker?.isConnected) throw new Error("Broker not connected");

    await broker.cancelOrder(orderId);
    const orders = await broker.getOrders();
    set({ orders });
  },
}));
