import type { VercelRequest, VercelResponse } from "@vercel/node";
import { scrapePornhubGet } from "../../lib/scrapers/pornhub/getController";
import options from "../../lib/options";
import { maybeError } from "../../lib/modifier";

// ── Node.js runtime (required for cheerio / http modules) ────────────────────
export const config = {
  runtime: "nodejs",
};

/**
 * GET /api/pornhub/random
 *
 * Returns a fully-scraped random Pornhub video.
 * PornHub's /video/random endpoint 302-redirects to a video page,
 * which our fetcher follows automatically.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json(maybeError(false, "Method not allowed"));
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const url  = `${options.PORNHUB}/video/random`;
    const data = await scrapePornhubGet(url);

    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    console.error("[pornhub/random]", e.message);
    return res.status(400).json(maybeError(false, e.message));
  }
}
