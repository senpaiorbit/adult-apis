import type { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { normalizeThumbnail, cleanText } from "../../../lib/format";
import { BASE_URLS } from "../../../config";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

interface VideoCard {
  id: string; title: string; thumb: string;
  duration: string; views: string; rating: string; url: string;
}

export async function trendingHandler(c: Context) {
  const page = c.req.query("page") || "1";

  try {
    const url  = `${BASE_URLS.PORNHUB}/video?o=tr&page=${page}`;
    const html = await fetchPage(url);
    const $    = new HtmlDoc(html).raw;
    const results: VideoCard[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $("li.pcVideoListItem").each((_i: any, el: any) => {
      const $el  = $(el);
      const href = $el.find("a.linkVideoThumb").attr("href") ?? "";
      if (!href) return;
      const id = href.includes("viewkey=") ? href.split("viewkey=")[1] : href.split("=").pop() ?? "";
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
    return c.json({ success: true, page: Number(page), total: results.length, data: results });
  } catch (err) {
    const e = err as Error;
    logger.error(`[pornhub/trending] ${e.message}`);
    return c.json(maybeError(false, e.message), 500);
  }
}
