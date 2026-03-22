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

const EXA_BASE = "https://api.exa.ai";

export async function exaSearch(
  query: string,
  numResults = 5,
): Promise<ExaSearchResponse> {
  const apiKey = import.meta.env.VITE_EXA_API_KEY;
  if (!apiKey) throw new Error("VITE_EXA_API_KEY not set");

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
    throw new Error(`Exa API ${response.status}`);
  }

  return response.json();
}

export async function exaCompanyResearch(
  companyName: string,
  numResults = 3,
): Promise<ExaSearchResponse> {
  return exaSearch(`${companyName} company news analysis`, numResults);
}
