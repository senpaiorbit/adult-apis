import { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, normalizeThumbnail, resolveUrl } from "../../../lib/format";
import { BASE_URL } from "../../../config";

export interface ModelInfo {
  name: string;
  url: string;
  avatar: string;
  subscribers: string;
  videoCount: string;
  views: string;
  rank: string;
}

export interface ModelVideosResult {
  success: boolean;
  model: ModelInfo;
  page: number;
  videos: {
    title: string;
    url: string;
    thumbnail: string;
    duration: string;
    views: string;
    rating: string;
  }[];
}

export async function modelHandler(c: Context) {
  const slug = c.req.query("name");
  const page = Number(c.req.query("page") ?? "1");

  if (!slug) {
    return c.json({ success: false, message: "Query param `name` is required." }, 400);
  }

  try {
    const url = `${BASE_URL}/pornstar/${encodeURIComponent(slug)}?page=${page}`;
    const html = await fetchPage(url);
    const doc = new HtmlDoc(html);

    // Model meta
    const name = cleanText(
      doc.attr('meta[property="og:title"]', "content") ||
      doc.text("h1[class]") || slug
    );
    const avatar = normalizeThumbnail(
      doc.attr('meta[property="og:image"]', "content") || ""
    );
    const subscribers = cleanText(
      doc.extract(/subscribersCount[^>]*>([^<]+)</) || ""
    );
    const videoCount = cleanText(
      doc.extract(/videosCount[^>]*>([^<]+)</) || ""
    );
    const views = cleanText(
      doc.extract(/viewsCount[^>]*>([^<]+)</) || ""
    );
    const rank = cleanText(
      doc.extract(/rank[^>]*>([^<]+)<(?:\/span>|\/div>)/) || ""
    );

    const model: ModelInfo = {
      name,
      url,
      avatar,
      subscribers,
      videoCount,
      views,
      rank,
    };

    // Video cards
    const cards = doc.scopeAll("li[class]").filter((el) =>
      el.raw().includes("pcVideoListItem")
    );

    const videos = cards.map((card) => ({
      title: cleanText(card.attr("span[class]", "title") || card.attr("a", "title") || ""),
      url: resolveUrl(card.attr("a[class]", "href") || card.attr("a", "href") || ""),
      thumbnail: normalizeThumbnail(
        card.attr("img", "data-thumb_url") ||
        card.attr("img", "data-mediumthumb") ||
        card.attr("img", "src") || ""
      ),
      duration: cleanText(card.text("var[class]") || ""),
      views: cleanText(card.extract(/data-video-views="([^"]+)"/) || ""),
      rating: cleanText(card.extract(/data-rating="([^"]+)"/) || ""),
    })).filter((v) => v.title || v.url);

    return c.json<ModelVideosResult>({
      success: true,
      model,
      page,
      videos,
    });
  } catch (err) {
    const e = err as Error;
    return c.json({ success: false, message: e.message }, 500);
  }
}
