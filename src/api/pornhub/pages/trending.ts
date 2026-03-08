import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { logger } from "../../../utils/logger";
import { extractVideoCards } from "../../../lib/parseCard";

const PH = BASE_URLS.PORNHUB; // https://www.pornhub.org

export async function trendingHandler(query: URLSearchParams): Promise<object> {
  const page = query.get("page") || "1";

  // Try multiple trending URLs in order
  const urlsToTry = [
    `${PH}/video?o=tr&page=${page}`,
    `${PH}/video?o=mv&page=${page}`,
    `${PH}/?page=${page}`,
    `${PH}/`,
  ];

  let html    = "";
  let usedUrl = "";

  for (const url of urlsToTry) {
    try {
      logger.info(`[pornhub/trending] trying: ${url}`);
      const raw = await fetchPage(url);
      if (raw.includes("pcVideoListItem") || raw.includes("data-video-vkey")) {
        html    = raw;
        usedUrl = url;
        logger.info(`[pornhub/trending] got video cards from: ${url}`);
        break;
      }
      logger.warn(`[pornhub/trending] no video cards at ${url}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[pornhub/trending] error at ${url}: ${msg}`);
    }
  }

  if (!html) {
    return {
      success: false,
      message: "All trending URL attempts failed",
      tried:   urlsToTry,
    };
  }

  const doc     = new HtmlDoc(html);
  const results = extractVideoCards(doc.raw, PH);

  logger.info(`[pornhub/trending] page=${page} results=${results.length}`);

  return {
    success: true,
    page:    Number(page),
    total:   results.length,
    source:  usedUrl,
    data:    results,
    ...(results.length === 0 ? { _debug: { usedUrl, ...doc.debugInfo() } } : {}),
  };
}
