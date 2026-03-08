import { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, normalizeThumbnail, resolveUrl } from "../../../lib/format";
import { BASE_URL } from "../../../config";

export interface TrendingVideo {
  rank: number;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  views: string;
}

export interface TrendingResult {
  success: boolean;
  total: number;
  videos: TrendingVideo[];
}

export async function trendingHandler(c: Context) {
  try {
    const html = await fetchPage(`${BASE_URL}/video?o=tr`);
    const doc = new HtmlDoc(html);

    const cards = doc.scopeAll("li[class]").filter((el) =>
      el.raw().includes("pcVideoListItem")
    );

    const videos: TrendingVideo[] = cards.slice(0, 50).map((card, i) => {
      const title = cleanText(
        card.attr("span[class]", "title") ||
        card.attr("a", "title") || ""
      );
      const href = card.attr("a[class]", "href") || card.attr("a", "href") || "";
      const thumb = normalizeThumbnail(
        card.attr("img", "data-thumb_url") ||
        card.attr("img", "data-mediumthumb") ||
        card.attr("img", "src") || ""
      );
      const duration = cleanText(card.text("var[class]") || "");
      const views = cleanText(card.extract(/data-video-views="([^"]+)"/) || "");

      return {
        rank: i + 1,
        title,
        url: resolveUrl(href),
        thumbnail: thumb,
        duration,
        views,
      };
    }).filter((v) => v.title || v.url);

    return c.json<TrendingResult>({
      success: true,
      total: videos.length,
      videos,
    });
  } catch (err) {
    const e = err as Error;
    return c.json({ success: false, message: e.message }, 500);
  }
}
