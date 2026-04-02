/**
 * Exa API client.
 * Uses the Supabase Edge Function proxy (proxy-exa) with authenticated user context.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";

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
    const edgeHeaders = await getEdgeHeaders();

    if (!edgeHeaders["x-user-token"]) {
      throw new Error("Sign in to use research features, or add your Exa API key in Settings.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/proxy-exa?endpoint=/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...edgeHeaders,
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
