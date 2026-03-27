import { AlpacaBroker } from "./alpaca";
import { IBKRBroker } from "./ibkr";
import { TradierBroker } from "./tradier";
import { SchwabBroker } from "./schwab";
import { EtradeBroker } from "./etrade";
import { WebullBroker } from "./webull";
import { SnapTradeBroker } from "./snaptrade";
import type { BrokerConnectionInterface } from "./types";

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
    name: "SnapTrade",
    slug: "snaptrade",
    icon: "🔗",
    description: "Connect any brokerage instantly — Schwab, Fidelity, Robinhood, E*Trade, Webull & more. No API keys needed.",
    isPaperAvailable: false,
    status: "available",
    credentialFields: [],
  },
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
    name: "Tradier",
    slug: "tradier",
    icon: "📈",
    description: "Developer-friendly broker with free market data. Paper trading included.",
    isPaperAvailable: true,
    status: "available",
    credentialFields: [
      { key: "apiToken", label: "API Token", type: "password", placeholder: "Your Tradier API token" },
      { key: "mode", label: "Mode", type: "select", placeholder: "paper" },
    ],
  },
  {
    name: "Schwab",
    slug: "schwab",
    icon: "💼",
    description: "Largest US retail broker. OAuth integration (requires token from OAuth flow).",
    isPaperAvailable: false,
    status: "available",
    credentialFields: [
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "OAuth access token" },
      { key: "refreshToken", label: "Refresh Token", type: "password", placeholder: "OAuth refresh token" },
      { key: "accountHash", label: "Account Hash (optional)", type: "text", placeholder: "Leave blank to auto-detect" },
    ],
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
    status: "available",
    credentialFields: [
      { key: "appKey", label: "App Key", type: "text", placeholder: "Your Webull app key" },
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "Your Webull access token" },
      { key: "mode", label: "Mode", type: "select", placeholder: "paper" },
    ],
  },
  {
    name: "E*Trade",
    slug: "etrade",
    icon: "📊",
    description: "Morgan Stanley brokerage with full options support.",
    isPaperAvailable: true,
    status: "available",
    credentialFields: [
      { key: "oauthToken", label: "OAuth Token", type: "password", placeholder: "From OAuth flow" },
      { key: "oauthTokenSecret", label: "OAuth Token Secret", type: "password", placeholder: "From OAuth flow" },
      { key: "accountIdKey", label: "Account ID Key (optional)", type: "text", placeholder: "Leave blank to auto-detect" },
      { key: "mode", label: "Mode", type: "select", placeholder: "live" },
    ],
  },
];

const instances: Record<string, BrokerConnectionInterface> = {};

export function getBrokerInstance(slug: string): BrokerConnectionInterface | null {
  if (instances[slug]) return instances[slug];
  const instance = createBrokerInstance(slug);
  if (instance) instances[slug] = instance;
  return instance;
}

/** Create a fresh broker adapter instance (not cached). Used for multi-connection support. */
export function createBrokerInstance(slug: string): BrokerConnectionInterface | null {
  switch (slug) {
    case "snaptrade":
      return new SnapTradeBroker();
    case "alpaca":
      return new AlpacaBroker();
    case "ibkr":
      return new IBKRBroker();
    case "tradier":
      return new TradierBroker();
    case "schwab":
      return new SchwabBroker();
    case "etrade":
      return new EtradeBroker();
    case "webull":
      return new WebullBroker();
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
