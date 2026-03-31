#!/usr/bin/env node

const baseUrl = process.env.SMOKE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const userToken = process.env.SMOKE_USER_TOKEN;
const symbol = process.env.SMOKE_SYMBOL ?? "AAPL";
const skipExa = process.env.SMOKE_SKIP_EXA === "1";

if (!baseUrl) {
  console.error("Missing SMOKE_SUPABASE_URL or VITE_SUPABASE_URL");
  process.exit(1);
}

if (!userToken) {
  console.error("Missing SMOKE_USER_TOKEN");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "x-user-token": userToken,
};

const checks = [
  {
    name: "finnhub quote",
    run: () => fetchJson(`${baseUrl}/functions/v1/finnhub?endpoint=quote&symbol=${symbol}`),
  },
  {
    name: "finnhub profile",
    run: () => fetchJson(`${baseUrl}/functions/v1/finnhub?endpoint=stock/profile2&symbol=${symbol}`),
  },
  {
    name: "fmp profile",
    run: () =>
      fetchJson(`${baseUrl}/functions/v1/fmp`, {
        method: "POST",
        headers,
        body: JSON.stringify({ endpoint: "profile", symbol }),
      }),
  },
  {
    name: "social trending",
    run: () => fetchJson(`${baseUrl}/functions/v1/proxy-social?source=stocktwits&action=trending`),
  },
  {
    name: "social reddit search",
    run: () => fetchJson(`${baseUrl}/functions/v1/proxy-social?source=reddit&action=search&symbol=${symbol}`),
  },
  ...(!skipExa
    ? [
        {
          name: "exa search",
          run: () =>
            fetchJson(`${baseUrl}/functions/v1/proxy-exa?endpoint=/search`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                query: `${symbol} stock news`,
                numResults: 2,
                type: "auto",
                contents: { text: { maxCharacters: 300 } },
              }),
            }),
        },
      ]
    : []),
];

let failures = 0;

for (const check of checks) {
  const startedAt = Date.now();
  try {
    const result = await check.run();
    const elapsed = Date.now() - startedAt;
    console.log(`PASS ${check.name} ${elapsed}ms`);
    if (result?.degraded) {
      console.log(`  degraded: ${JSON.stringify(result.degraded)}`);
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  process.exit(1);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${body.error ?? "Request failed"}`);
  }

  return body;
}
