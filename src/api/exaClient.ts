/**
 * Exa API client — direct browser call with API key.
 */

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

// In dev, Vite proxies /exa-api/* to https://api.exa.ai
const EXA_BASE = "/exa-api";

export async function exaSearch(
  query: string,
  numResults = 5,
): Promise<ExaSearchResponse> {
  const apiKey = import.meta.env.VITE_EXA_API_KEY;
  if (!apiKey) throw new Error("Exa API key not configured. Add VITE_EXA_API_KEY to your .env file or configure it in Settings.");

  const response = await fetch(`${EXA_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "auto",
      contents: { text: { maxCharacters: 1000 } },
    }),
  });

  if (!response.ok) {
    let detail = `Exa API ${response.status}`;
    try {
      const body = await response.json();
      detail = body.error || body.message || detail;
    } catch {
      // response wasn't JSON
    }
    throw new Error(detail);
  }

  const data = await response.json();
  return { results: data.results ?? [] };
}

export async function exaCompanyResearch(
  companyName: string,
  numResults = 3,
): Promise<ExaSearchResponse> {
  return exaSearch(`${companyName} company news analysis`, numResults);
}
