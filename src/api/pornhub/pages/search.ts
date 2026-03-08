import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";
import { extractVideoCards } from "../../../lib/parseCard";

const PH = BASE_URLS.PORNHUB; // https://www.pornhub.org

export async function searchHandler(query: URLSearchParams): Promise<object> {
  const q    = query.get("q");
  const page = query.get("page") || "1";

  if (!q) return maybeError(false, "Query param `q` is required");

  const url = `${PH}/video/search?search=${encodeURIComponent(q.trim())}&p=${page}`;
  logger.info(`[pornhub/search] fetching: ${url}`);

  let html: string;
  try {
    html = await fetchPage(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pornhub/search] fetch failed: ${msg}`);
    return { success: false, message: msg };
  }

  const doc     = new HtmlDoc(html);
  const results = extractVideoCards(doc.raw, PH);

  logger.info(`[pornhub/search] q="${q}" page=${page} results=${results.length}`);

  return {
    success: true,
    query:   q,
    page:    Number(page),
    total:   results.length,
    data:    results,
    ...(results.length === 0 ? { _debug: { url, ...doc.debugInfo() } } : {}),
  };
}
