import { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, resolveUrl, normalizeThumbnail } from "../../../lib/format";
import { BASE_URL } from "../../../config";

export interface Category {
  name: string;
  url: string;
  thumbnail: string;
  videoCount: string;
}

export interface CategoriesResult {
  success: boolean;
  total: number;
  categories: Category[];
}

export async function categoriesHandler(c: Context) {
  try {
    const html = await fetchPage(`${BASE_URL}/categories`);
    const doc = new HtmlDoc(html);

    // Each category sits in <li class="pcVideoListItem ..."> or similar wrapper
    const items = doc.scopeAll("li[class]").filter((el) =>
      el.raw().includes("categoriesWrap") ||
      el.raw().includes("pcVideoListItem") ||
      el.raw().includes("category")
    );

    const categories: Category[] = items.map((item) => {
      const name = cleanText(
        item.text("span[class]") || item.attr("a", "title") || ""
      );
      const href = item.attr("a", "href") || "";
      const thumb = normalizeThumbnail(
        item.attr("img", "data-thumb_url") ||
        item.attr("img", "src") || ""
      );
      const videoCount = cleanText(item.extract(/(\d[\d,]*)\s*(?:videos|Videos)/));

      return {
        name,
        url: resolveUrl(href),
        thumbnail: thumb,
        videoCount,
      };
    }).filter((c) => c.name);

    const result: CategoriesResult = {
      success: true,
      total: categories.length,
      categories,
    };

    return c.json(result);
  } catch (err) {
    const e = err as Error;
    return c.json({ success: false, message: e.message }, 500);
  }
}
