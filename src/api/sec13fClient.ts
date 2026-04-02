/**
 * Client for the SEC 13F edge function proxy.
 *
 * Provides typed access to institutional holdings data from SEC EDGAR.
 * No API key needed — SEC EDGAR is free for public access.
 */

import { isSupabaseConfigured } from "../lib/supabase";
import { getEdgeHeaders } from "./edgeHeaders";
import { parseEdgeError } from "./parseEdgeError";

async function sec13fCall<T>(params: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("SEC 13F data unavailable. Please sign in for automatic access.");
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sec-13f`;
  const headers = await getEdgeHeaders();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    await parseEdgeError(response, "SEC 13F");
  }

  const result = await response.json();
  return result.data as T;
}

/* ─── Types ─────────────────────────────────────────── */

export interface InstitutionalFiler {
  name: string;
  cik: string;
  manager: string;
}

export interface FilerHoldings {
  cik: string;
  name: string;
  filings: Filing13F[];
  latestFilingDate: string;
  latestAccession: string;
  latestUrl: string;
}

export interface Filing13F {
  form: string;
  filingDate: string;
  accession: string;
  document: string;
}

export interface EdgarSearchResult {
  hits: {
    total: { value: number };
    hits: Array<{
      _source: {
        file_date: string;
        entity_name: string;
        file_num: string;
        file_url: string;
        entity_id: string;
      };
    }>;
  };
}

/* ─── API Functions ─────────────────────────────────── */

/** Get curated list of top institutional filers */
export function getTopFilers(): Promise<InstitutionalFiler[]> {
  return sec13fCall({ endpoint: "filers" });
}

/** Search for institutional filers by name */
export function searchFiler(query: string): Promise<EdgarSearchResult> {
  return sec13fCall({ endpoint: "search-filer", query });
}

/** Get holdings/filings for a specific CIK */
export function getHoldings(cik: string): Promise<FilerHoldings> {
  return sec13fCall({ endpoint: "holdings", cik });
}

/** Find institutions that hold a specific ticker */
export function getHolders(ticker: string): Promise<EdgarSearchResult> {
  return sec13fCall({ endpoint: "holders", ticker });
}
