// ── Vercel EDGE runtime – zero cold-start, pure Web APIs ─────────────────────
export const config = {
  runtime: "edge",
};

/**
 * GET /api/index  (also mapped from /)
 *
 * Lightweight API directory – runs on the Edge for near-instant response times.
 */
export default function handler() {
  const body = JSON.stringify({
    name:        "AdultColony API",
    version:     "1.0.0",
    description: "Vercel Serverless API for scraping adult content sites.",
    docs:        "https://github.com/Snowball-01/AdultColony-API",
    stats:       "/stats",
    sites: {
      pornhub: {
        get:    "/pornhub/get?id=<viewkey>",
        search: "/pornhub/search?query=<term>&page=<n>",
        random: "/pornhub/random",
      },
    },
  });

  return new Response(body, {
    status:  200,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      // Cache the index for 60 s at the edge
      "Cache-Control":               "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
