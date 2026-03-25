import { AlpacaBroker } from "./alpaca";
import { IBKRBroker } from "./ibkr";
import type { BrokerConnection } from "./types";

export interface BrokerInfo {
  name: string;
  slug: string;
  icon: string;
  description: string;
  isPaperAvailable: boolean;
  status: "available" | "coming_soon";
  credentialFields: { key: string; label: string; type: string; placeholder: string }[];
}

export const BROKER_REGISTRY: BrokerInfo[] = [
  {
    name: "Alpaca",
    slug: "alpaca",
    icon: "🦙",
    description: "Commission-free API-first broker. Paper trading included.",
    isPaperAvailable: true,
    status: "available",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "text", placeholder: "PK..." },
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "Your secret key" },
      { key: "mode", label: "Mode", type: "select", placeholder: "paper" },
    ],
  },
  {
    name: "Interactive Brokers",
    slug: "ibkr",
    icon: "🏦",
    description: "Professional-grade broker. Requires local Radon + IB Gateway.",
    isPaperAvailable: true,
    status: "available",
    credentialFields: [
      { key: "apiUrl", label: "FastAPI URL", type: "text", placeholder: "http://localhost:8321" },
    ],
  },
  {
    name: "Schwab",
    slug: "schwab",
    icon: "💼",
    description: "Largest US retail broker. OAuth integration.",
    isPaperAvailable: false,
    status: "coming_soon",
    credentialFields: [],
  },
  {
    name: "Robinhood",
    slug: "robinhood",
    icon: "🪶",
    description: "Commission-free broker for US equities and options.",
    isPaperAvailable: false,
    status: "coming_soon",
    credentialFields: [],
  },
  {
    name: "Webull",
    slug: "webull",
    icon: "🐂",
    description: "Mobile-first broker with extended hours trading.",
    isPaperAvailable: true,
    status: "coming_soon",
    credentialFields: [],
  },
  {
    name: "E*Trade",
    slug: "etrade",
    icon: "📊",
    description: "Morgan Stanley brokerage with full options support.",
    isPaperAvailable: false,
    status: "coming_soon",
    credentialFields: [],
  },
];

const instances: Record<string, BrokerConnection> = {};

export function getBrokerInstance(slug: string): BrokerConnection | null {
  if (instances[slug]) return instances[slug];
  switch (slug) {
    case "alpaca":
      instances[slug] = new AlpacaBroker();
      return instances[slug];
    case "ibkr":
      instances[slug] = new IBKRBroker();
      return instances[slug];
    default:
      return null;
  }
}

export function getActiveBrokerSlug(): string | null {
  return localStorage.getItem("sibt_active_broker");
}

export function setActiveBrokerSlug(slug: string | null): void {
  if (slug) {
    localStorage.setItem("sibt_active_broker", slug);
  } else {
    localStorage.removeItem("sibt_active_broker");
  }
}
