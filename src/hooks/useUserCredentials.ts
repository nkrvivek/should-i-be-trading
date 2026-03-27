import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export type CredentialProvider = "ibkr" | "unusual_whales" | "anthropic" | "exa" | "finnhub" | "alpha_vantage";

export const PROVIDER_CONFIG: Record<CredentialProvider, { label: string; description: string; docsUrl: string }> = {
  unusual_whales: {
    label: "Unusual Whales",
    description: "Dark pool flow, options flow, sweeps, analyst ratings, seasonality",
    docsUrl: "https://unusualwhales.com/api",
  },
  anthropic: {
    label: "Anthropic Claude",
    description: "AI-powered market analysis and trading confidant",
    docsUrl: "https://console.anthropic.com/",
  },
  exa: {
    label: "Exa Search",
    description: "Web research, company analysis, news discovery",
    docsUrl: "https://exa.ai/",
  },
  ibkr: {
    label: "Interactive Brokers",
    description: "Real-time quotes, portfolio, order execution via IB Gateway",
    docsUrl: "https://www.interactivebrokers.com/",
  },
  finnhub: {
    label: "Finnhub",
    description: "Economic calendar, insider trades, ESG scores, earnings",
    docsUrl: "https://finnhub.io/",
  },
  alpha_vantage: {
    label: "Alpha Vantage",
    description: "Technical indicators, news sentiment scoring",
    docsUrl: "https://www.alphavantage.co/",
  },
};

export function useUserCredentials() {
  const { user, setCredentials } = useAuthStore();

  const refreshCredentials = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_credentials")
      .select("provider, is_valid, last_validated_at")
      .eq("user_id", user.id);
    if (data) setCredentials(data);
  }, [user, setCredentials]);

  const saveCredential = useCallback(
    async (provider: CredentialProvider, credentialData: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_credentials")
        .upsert(
          {
            user_id: user.id,
            provider,
            credential_data: credentialData,
            is_valid: true, // will be validated by edge function
            last_validated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider" },
        );

      if (error) throw error;
      await refreshCredentials();
    },
    [user, refreshCredentials],
  );

  const removeCredential = useCallback(
    async (provider: CredentialProvider) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_credentials")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (error) throw error;
      await refreshCredentials();
    },
    [user, refreshCredentials],
  );

  return { saveCredential, removeCredential, refreshCredentials };
}
