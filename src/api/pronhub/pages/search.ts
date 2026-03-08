import { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, normalizeThumbnail, resolveUrl, secondsToDisplay } from "../../../lib/format";
import { BASE_URL } from "../../../config";

export interface VideoCard {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  views: string;
  rating: string;
}

export interface SearchResult {
  success: boolean;
  query: string;
  page: number;
  results: VideoCard[];
}

export async function searchHandler(c: Context) {
  const q = c.req.query("q");
  const page = Number(c.req.query("page") ?? "1");

  if (!q) {
    return c.json({ success: false, message: "Query param `q` is required." }, 400);
  }

  try {
    const url = `${BASE_URL}/video/search?search=${encodeURIComponent(q)}&page=${page}`;
    const html = await fetchPage(url);
    const doc = new HtmlDoc(html);

    // Each video card lives in <li class="pcVideoListItem ...">
    const cards = doc.scopeAll("li[class]").filter((el) =>
      el.raw().includes("pcVideoListItem")
    );

    const results: VideoCard[] = cards.map((card) => {
      const title = cleanText(card.attr("span[class]", "title") || card.attr("a", "title") || "");
      const href = card.attr("a[class]", "href") || card.attr("a", "href") || "";
      const thumb = normalizeThumbnail(
        card.attr("img", "data-thumb_url") ||
        card.attr("img", "data-mediumthumb") ||
        card.attr("img", "src") || ""
      );
      const duration = card.text("var[class]") || card.text("span[class]") || "";
      const views = card.extract(/data-video-views="([^"]+)"/) ||
        card.extract(/class="views"[^>]*>([^<]+)/);
      const rating = card.extract(/data-rating="([^"]+)"/) ||
        card.extract(/class="[^"]*rating[^"]*"[^>]*>([^<]+)/);

      return {
        title,
        url: resolveUrl(href),
        thumbnail: thumb,
        duration: cleanText(duration),
        views: cleanText(views),
        rating: cleanText(rating),
      };
    }).filter((r) => r.title || r.url);

    const response: SearchResult = {
      success: true,
      query: q,
      page,
      results,
    };

    return c.json(response);
  } catch (err) {
    const e = err as Error;
    return c.json({ success: false, message: e.message }, 500);
  }
}
