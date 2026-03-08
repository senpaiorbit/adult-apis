import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { extractVideoCards } from "../../../lib/parseCard";

const PH = BASE_URLS.PORNHUB;

export async function debugHandler(query: URLSearchParams): Promise<object> {
  const target = query.get("url") || `${PH}/`;
  let html: string;
  let fetchError: string | null = null;

  try {
    html = await fetchPage(target);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      url:     target,
      error:   fetchError,
    };
  }

  const doc     = new HtmlDoc(html);
  const results = extractVideoCards(doc.raw, PH);

  return {
    success:     true,
    url:         target,
    videoCards:  results.length,
    firstCard:   results[0] ?? null,
    debug:       doc.debugInfo(),
  };
}
