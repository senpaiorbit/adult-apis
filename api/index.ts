import type { VercelRequest, VercelResponse } from "@vercel/node";
import { route, getCorsHeaders } from "../src/router";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsHeaders = getCorsHeaders();

  // Pre-flight
  if (req.method === "OPTIONS") {
    return res
      .status(204)
      .setHeader("Access-Control-Allow-Origin",  corsHeaders["Access-Control-Allow-Origin"])
      .setHeader("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"])
      .setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"])
      .end();
  }

  // Only allow GET
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    // Parse pathname + query from the request URL
    const rawUrl   = req.url ?? "/";
    const base     = "http://localhost";
    const parsed   = new URL(rawUrl, base);
    const pathname = parsed.pathname;
    const query    = parsed.searchParams;

    const { body, status } = await route(pathname, query);

    return res
      .status(status)
      .setHeader("Content-Type",                 "application/json")
      .setHeader("Access-Control-Allow-Origin",  corsHeaders["Access-Control-Allow-Origin"])
      .setHeader("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"])
      .setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"])
      .json(body);

  } catch (err) {
    const e = err as Error;
    console.error("[handler crash]", e);
    return res
      .status(500)
      .json({ success: false, message: e.message ?? "Internal server error" });
  }
}
