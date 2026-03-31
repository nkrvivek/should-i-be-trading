import { getEdgeHeaders } from "../api/edgeHeaders";
import { getCredential } from "./credentials";
import { isSupabaseConfigured } from "./supabase";

export interface CompanyInfo {
  name: string;
  sector: string;
}

const companyCache = new Map<string, CompanyInfo>();
const inflight = new Map<string, Promise<CompanyInfo | null>>();

export function getCachedCompanyInfo(symbol: string): CompanyInfo | null {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return companyCache.get(normalizedSymbol) ?? null;
}

export async function fetchCompanyInfo(symbol: string): Promise<CompanyInfo | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) return null;

  const cached = companyCache.get(normalizedSymbol);
  if (cached) return cached;

  const pending = inflight.get(normalizedSymbol);
  if (pending) return pending;

  const request = (async () => {
    try {
      let response: Response | null = null;
      const apiKey = getCredential("finnhub");

      if (apiKey) {
        response = await fetch(`/finnhub-api/api/v1/stock/profile2?symbol=${encodeURIComponent(normalizedSymbol)}&token=${apiKey}`);
      } else if (isSupabaseConfigured()) {
        const edgeHeaders = await getEdgeHeaders();
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finnhub?endpoint=stock/profile2&symbol=${encodeURIComponent(normalizedSymbol)}`;
        response = await fetch(edgeUrl, { headers: edgeHeaders });
      }

      if (!response?.ok) return null;

      const data = await response.json();
      if (!data?.name) return null;

      const info = {
        name: data.name as string,
        sector: (data.finnhubIndustry as string | undefined) ?? "",
      };

      companyCache.set(normalizedSymbol, info);
      return info;
    } catch {
      return null;
    } finally {
      inflight.delete(normalizedSymbol);
    }
  })();

  inflight.set(normalizedSymbol, request);
  return request;
}
