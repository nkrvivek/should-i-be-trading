/**
 * Unified credential resolution.
 *
 * Priority order:
 * 1. Supabase user_credentials (via authStore)
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
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${provider}`, value);
  } catch { /* ignore */ }
}

/** Remove credential from localStorage */
export function removeLocalCredential(provider: CredentialProvider) {
  try {
    localStorage.removeItem(`${LOCAL_PREFIX}${provider}`);
  } catch { /* ignore */ }
}

/** Get credential from localStorage */
function getLocalCredential(provider: CredentialProvider): string | null {
  try {
    return localStorage.getItem(`${LOCAL_PREFIX}${provider}`) || null;
  } catch {
    return null;
  }
}

/** Get credential from env */
function getEnvCredential(provider: CredentialProvider): string | null {
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
  // 1. localStorage (set by Settings UI)
  const local = getLocalCredential(provider);
  if (local) return local;

  // 2. Also check legacy key patterns
  if (provider === "finnhub") {
    try {
      const legacy = localStorage.getItem("sibt_finnhub_key");
      if (legacy) return legacy;
    } catch { /* ignore */ }
  }

  // 3. Env variable
  const env = getEnvCredential(provider);
  if (env) return env;

  return null;
}
