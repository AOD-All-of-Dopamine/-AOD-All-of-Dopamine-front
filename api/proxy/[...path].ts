import type { VercelRequest, VercelResponse } from "@vercel/node";

// Proxy that forwards requests to the real API origin and returns the response
// with CORS headers so browser clients on the same origin can consume it.
// Configure the target via the API_ORIGIN environment variable (e.g.
// https://api.allofdophamin.com). If not provided, defaults to
// https://api.allofdophamin.com

const API_ORIGIN = process.env.API_ORIGIN || "https://api.allofdophamin.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Preflight handling: respond locally to OPTIONS so the backend is not hit
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type,Accept",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(204).end();
    return;
  }

  // Build target URL
  const pathParts = (req.query.path || []) as string[];
  const path = pathParts.join("/");
  const query = req.url?.split("?")[1] || "";
  const targetUrl = `${API_ORIGIN}/${path}${query ? `?${query}` : ""}`;

  try {
    // Forward headers (preserve Authorization if present). Remove host to avoid conflicts.
    const forwardedHeaders: Record<string, string> = {};
    Object.entries(req.headers).forEach(([k, v]) => {
      if (!v) return;
      const key = k.toLowerCase();
      if (key === "host") return;
      // Vercel gives header values as string | string[]
      forwardedHeaders[key] = Array.isArray(v) ? v.join(",") : v;
    });

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardedHeaders,
      // forward body when present
      body:
        req.body && Object.keys(req.body).length
          ? JSON.stringify(req.body)
          : undefined,
      // credentials: 'include' is not relevant here; we're server-side
    };

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    // Copy status, headers, and body
    const body = await upstreamRes.arrayBuffer();

    // Copy upstream headers except hop-by-hop ones
    upstreamRes.headers.forEach((value, name) => {
      const hopByHop = [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
      ];
      if (hopByHop.includes(name.toLowerCase())) return;
      res.setHeader(name, value);
    });

    // Ensure CORS headers for same-origin frontend
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.status(upstreamRes.status).send(Buffer.from(body));
  } catch (err: any) {
    // If upstream fails, return a clear error but include CORS headers so browser
    // will receive the error body instead of only a CORS rejection message.
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    console.error("Proxy error:", err);
    res
      .status(502)
      .json({
        message: "Bad Gateway (proxy error)",
        detail: err?.message ?? String(err),
      });
  }
}
