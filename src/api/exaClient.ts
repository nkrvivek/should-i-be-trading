/**
 * Exa API client.
 * Uses the Supabase Edge Function proxy (proxy-exa) with authenticated user context.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type ExaResult = {
  title: string;
  url: string;
  publishedDate: string;
  text: string;
  score: number;
};

export type ExaSearchResponse = {
  results: ExaResult[];
};

export async function exaSearch(
  query: string,
  numResults = 5,
  maxCharacters = 1000,
): Promise<ExaSearchResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const body = {
    query,
    numResults,
    type: "auto",
    contents: { text: { maxCharacters } },
  };

  if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
    // Production: Supabase Edge Function proxy (uses stored credential)
    const { data: sessionData } = await supabase.auth.getSession();
    const userToken = sessionData.session?.access_token;

    if (!userToken) {
      throw new Error("Sign in to use research features, or add your Exa API key in Settings.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/proxy-exa?endpoint=/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "x-user-token": userToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      let detail = `Exa API ${response.status}`;
      try {
        const b = await response.json();
        detail = b.error || b.message || detail;
      } catch { /* not JSON */ }
      throw new Error(detail);
    }

    const data = await response.json();
    return { results: data.results ?? [] };

  } else {
    throw new Error("Sign in to use research features.");
  }
}

export async function exaCompanyResearch(
  companyName: string,
  numResults = 3,
): Promise<ExaSearchResponse> {
  return exaSearch(`${companyName} company news analysis`, numResults);
}
