import type { VercelRequest, VercelResponse } from "@vercel/node";
import { route, getCorsHeaders } from "../src/router";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cors = getCorsHeaders();

  // Pre-flight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin",  cors["Access-Control-Allow-Origin"]);
    res.setHeader("Access-Control-Allow-Methods", cors["Access-Control-Allow-Methods"]);
    res.setHeader("Access-Control-Allow-Headers", cors["Access-Control-Allow-Headers"]);
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const rawUrl   = req.url ?? "/";
    const parsed   = new URL(rawUrl, "http://localhost");
    const pathname = parsed.pathname;
    const query    = parsed.searchParams;

    const { body, status } = await route(pathname, query);

    res.setHeader("Content-Type",                 "application/json");
    res.setHeader("Access-Control-Allow-Origin",  cors["Access-Control-Allow-Origin"]);
    res.setHeader("Access-Control-Allow-Methods", cors["Access-Control-Allow-Methods"]);
    res.setHeader("Access-Control-Allow-Headers", cors["Access-Control-Allow-Headers"]);
    return res.status(status).json(body);

  } catch (err) {
    const e = err as Error;
    console.error("[handler crash]", e.message, e.stack);
    return res.status(500).json({ success: false, message: e.message ?? "Internal server error" });
  }
}
