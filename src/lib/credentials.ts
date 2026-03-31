/**
 * Unified credential resolution.
 *
 * Production priority:
 * 1. Supabase user_credentials (via authenticated edge functions)
 *
 * Development fallback:
 * 2. localStorage fallback (sibt_cred_{provider})
 * 3. Vite env variable (VITE_{PROVIDER}_API_KEY)
 *
 * Settings UI saves to both Supabase AND localStorage,
 * so credentials work with or without Supabase.
 */

import type { CredentialProvider } from "../hooks/useUserCredentials";

const LOCAL_PREFIX = "sibt_cred_";

const ENV_MAP: Partial<Record<CredentialProvider, string>> = {
  anthropic: "VITE_ANTHROPIC_API_KEY",
  exa: "VITE_EXA_API_KEY",
  finnhub: "VITE_FINNHUB_API_KEY",
  unusual_whales: "VITE_UW_TOKEN",
  alpha_vantage: "VITE_ALPHA_VANTAGE_API_KEY",
};

/** Save credential to localStorage (always called alongside Supabase save) */
export function saveLocalCredential(provider: CredentialProvider, value: string) {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${provider}`, value);
  } catch { /* ignore */ }
}

/** Remove credential from localStorage */
export function removeLocalCredential(provider: CredentialProvider) {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.removeItem(`${LOCAL_PREFIX}${provider}`);
  } catch { /* ignore */ }
}

/** Get credential from localStorage */
function getLocalCredential(provider: CredentialProvider): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    return localStorage.getItem(`${LOCAL_PREFIX}${provider}`) || null;
  } catch {
    return null;
  }
}

/** Get credential from env */
function getEnvCredential(provider: CredentialProvider): string | null {
  if (!import.meta.env.DEV) return null;
  const key = ENV_MAP[provider];
  if (!key) return null;
  const val = import.meta.env[key];
  return val || null;
}

/**
 * Resolve a credential for a provider.
 * Works everywhere — with or without Supabase, with or without env vars.
 */
export function getCredential(provider: CredentialProvider): string | null {
  // Dev-only local fallback
  const local = getLocalCredential(provider);
  if (local) return local;

  // Dev-only legacy key patterns
  if (provider === "finnhub") {
    if (!import.meta.env.DEV) return null;
    try {
      const legacy = localStorage.getItem("sibt_finnhub_key");
      if (legacy) return legacy;
    } catch { /* ignore */ }
  }

  // Dev-only env variable
  const env = getEnvCredential(provider);
  if (env) return env;

  return null;
}
