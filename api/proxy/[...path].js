// Vercel serverless proxy (JavaScript)
// Forwards requests to the API origin specified by API_ORIGIN env var
// and returns the response with CORS headers so the frontend can call
// same-origin /api/... without CORS issues.

const API_ORIGIN = process.env.API_ORIGIN || "https://api.allofdophamin.com";

module.exports = async (req, res) => {
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

  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const path = pathParts.join("/");
  const query = req.url && req.url.includes("?") ? req.url.split("?")[1] : "";
  const targetUrl = `${API_ORIGIN}/${path}${query ? `?${query}` : ""}`;

  try {
    // Forward headers (preserve Authorization, Cookie, etc.)
    const forwardedHeaders = {};
    Object.keys(req.headers).forEach((k) => {
      if (!req.headers[k]) return;
      const key = k.toLowerCase();
      if (key === "host") return;
      forwardedHeaders[key] = Array.isArray(req.headers[k])
        ? req.headers[k].join(",")
        : req.headers[k];
    });

    const body =
      req.body && Object.keys(req.body).length
        ? JSON.stringify(req.body)
        : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
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
      res.setHeader(name, value);
    });

    // Ensure CORS headers so browser receives the response
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.status(upstreamRes.status).send(buffer);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    console.error("Proxy error:", err);
    res
      .status(502)
      .json({
        message: "Bad Gateway (proxy error)",
        detail: err && err.message ? err.message : String(err),
      });
  }
};
