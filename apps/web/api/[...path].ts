import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel serverless proxy (catch-all at /api/*) - TypeScript
// For local dev use `vercel dev` or deploy to Vercel. Ensure devDependencies
// include @vercel/node and @types/node (installed previously).

const API_ORIGIN = process.env.API_ORIGIN || "https://api.allofdophamin.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight locally
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

  const rawPath = req.query.path;
  const pathParts: string[] = Array.isArray(rawPath)
    ? rawPath
    : rawPath
      ? [String(rawPath)]
      : [];
  const path = pathParts.join("/");
  const query = req.url && req.url.includes("?") ? req.url.split("?")[1] : "";
  const targetUrl = `${API_ORIGIN}/${path}${query ? `?${query}` : ""}`;

  try {
    // Forward headers (preserve Authorization, Cookie, etc.)
    const forwardedHeaders: Record<string, string> = {};
    Object.keys(req.headers).forEach((k) => {
      const v = req.headers[k as keyof typeof req.headers];
      if (!v) return;
      const key = k.toLowerCase();
      if (key === "host") return;
      forwardedHeaders[key] = Array.isArray(v) ? v.join(",") : String(v);
    });

    const body =
      req.body && Object.keys(req.body).length
        ? JSON.stringify(req.body)
        : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders as HeadersInit,
      body,
    });

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
      // Some header names may be set multiple times; use setHeader to overwrite
      res.setHeader(name, value);
    });

    // Ensure CORS headers so browser receives the response
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.status(upstreamRes.status).send(buffer);
  } catch (err: unknown) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    console.error("Proxy error:", err);
    const detail =
      err && typeof err === "object" && "message" in err
        ? (err as any).message
        : String(err);
    res.status(502).json({ message: "Bad Gateway (proxy error)", detail });
  }
}
