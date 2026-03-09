import type { VercelRequest, VercelResponse } from "@vercel/node";
import { scrapePornhubGet } from "../../lib/scrapes/pornhub/getController";
import options from "../../lib/options";
import { maybeError } from "../../lib/modifier";

/**
 * GET /api/pornhub/get?id=<viewkey>
 *
 * Returns full metadata + stream asset URLs for a single Pornhub video.
 *
 * Query params:
 *   id  (required) – PornHub viewkey, e.g. ph63c4e1dc48fe7
 *
 * Example:
 *   /api/pornhub/get?id=ph63c4e1dc48fe7
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
    const id = req.query.id as string | undefined;
    if (!id) {
      return res.status(400).json(maybeError(false, "Parameter 'id' is required"));
    }

    const url  = `${options.PORNHUB}/view_video.php?viewkey=${id}`;
    const data = await scrapePornhubGet(url);

    return res.status(200).json(data);
  } catch (err) {
    const e = err as Error;
    console.error("[pornhub/get]", e.message);
    return res.status(400).json(maybeError(false, e.message));
  }
}
