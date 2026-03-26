import { authenticateRequest, getUserCredential, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const UW_BASE = "https://api.unusualwhales.com/api";

// Allowed path prefixes to prevent SSRF
const ALLOWED_PATH_PREFIXES = [
  "/stock/", "/options/", "/market/", "/darkpool/",
  "/flow/", "/etf/", "/congress/", "/insider/",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);
    const uwToken = await getUserCredential(ctx, "unusual_whales");

    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) return errorResponse("Missing 'path' query parameter", 400, req);

    // Validate path — no traversal, must start with allowed prefix
    if (path.includes("..") || path.includes("//") || !path.startsWith("/")) {
      return errorResponse("Invalid path", 400, req);
    }

    const allowed = ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (!allowed) {
      return errorResponse(`Path not allowed: ${path}`, 403, req);
    }

    const upstreamUrl = `${UW_BASE}${path}`;
    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${uwToken}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const data = await response.json();
    return jsonResponse(data, response.status, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, msg.includes("credential") ? 403 : 500, req);
  }
});
