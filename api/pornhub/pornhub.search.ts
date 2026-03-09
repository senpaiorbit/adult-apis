import type { VercelRequest, VercelResponse } from "@vercel/node";
import { scrapePornhubSearch } from "../../lib/scrapers/pornhub/searchController";
import options from "../../lib/options";
import { maybeError, spacer } from "../../lib/modifier";

/**
 * GET /api/pornhub/search?query=<term>&page=<n>
 *
 * Searches Pornhub and returns a list of video results.
 *
 * Query params:
 *   query  (required) – search term, e.g. "milf"
 *   page   (optional, default 1) – result page number
 *
 * Examples:
 *   /api/pornhub/search?query=milf
 *   /api/pornhub/search?query=milf&page=2
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
    const query = req.query.query as string | undefined;
    const page  = req.query.page  as string | undefined ?? "1";

    if (!query) {
      return res.status(400).json(maybeError(false, "Parameter 'query' is required"));
    }
    if (isNaN(Number(page))) {
      return res.status(400).json(maybeError(false, "Parameter 'page' must be a number"));
    }

    const url  = `${options.PORNHUB}/video/search?search=${spacer(query)}&page=${page}`;
    const data = await scrapePornhubSearch(url);

    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    console.error("[pornhub/search]", e.message);
    return res.status(400).json(maybeError(false, e.message));
  }
}
