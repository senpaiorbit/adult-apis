import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { normalizeThumbnail, cleanText } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

export async function trendingHandler(query: URLSearchParams): Promise<object> {
  const page = query.get("page") || "1";

  const url  = `${BASE_URLS.PORNHUB}/video?o=tr&page=${page}`;
  const html = await fetchPage(url);
  const $    = new HtmlDoc(html).raw;

  const results: object[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("li.pcVideoListItem").each((_i: any, el: any) => {
    const $el  = $(el);
    const href = $el.find("a.linkVideoThumb").attr("href") ?? "";
    if (!href) return;

    const id = href.includes("viewkey=")
      ? href.split("viewkey=")[1]
      : href.split("=").pop() ?? "";

    results.push({
      id,
      title:    cleanText($el.find(".title a").text()),
      thumb:    normalizeThumbnail(
        $el.find("img").attr("data-thumb_url") ||
        $el.find("img").attr("data-mediumthumb") ||
        $el.find("img").attr("src") || ""
      ),
      duration: cleanText($el.find("var.duration").text()),
      views:    cleanText($el.find("span.count").text()),
      rating:   cleanText($el.find("div.value").first().text()),
      url:      `${BASE_URLS.PORNHUB}${href}`,
    });
  });

  logger.info(`[pornhub/trending] page=${page} results=${results.length}`);

  return { success: true, page: Number(page), total: results.length, data: results };
}
