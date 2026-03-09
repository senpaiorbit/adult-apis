import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/stats
 *
 * Returns runtime metadata about the current serverless invocation.
 * Unlike a long-running server there's no persistent RSS / heap to report,
 * so we surface what Vercel makes available: region, Node version, timestamp.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const mem = process.memoryUsage();

  return res.status(200).json({
    success:    true,
    date:       new Date().toISOString(),
    region:     process.env.VERCEL_REGION ?? "unknown",
    node:       process.version,
    rss:        `${(mem.rss          / 1024 / 1024).toFixed(2)} MB`,
    heap:       `${(mem.heapUsed     / 1024 / 1024).toFixed(2)} / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    sites:      ["pornhub"],        // expand as more scrapers are added
    endpoints: {
      pornhub: [
        "GET /pornhub/get?id=<viewkey>",
        "GET /pornhub/search?query=<term>&page=<n>",
        "GET /pornhub/random",
      ],
    },
  });
}
