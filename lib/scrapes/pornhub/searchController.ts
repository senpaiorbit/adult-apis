import { load } from "cheerio";
import { fetchBody } from "../../fetcher";
import options from "../../options";
import type { ISearchVideoData } from "../../interfaces";

/**
 * Scrape Pornhub search results page.
 * @param url  Full search URL, e.g. https://pornhub.org/video/search?search=milf&page=1
 */
export async function scrapePornhubSearch(url: string): Promise<ISearchVideoData> {
  const buffer = await fetchBody(url);
  const $ = load(buffer);

  const results = $("div.wrap")
    .map((_, el) => {
      const link     = $(el).find("a").attr("href");
      const id       = link?.split("=")[1];
      const title    = $(el).find("a").attr("title");
      const image    = $(el).find("img").attr("src");
      const duration = $(el).find("var.duration").text();
      const views    = $(el)
        .find("div.videoDetailsBlock")
        .find("span.views")
        .text();

      return {
        link:     `${options.PORNHUB}${link}`,
        id,
        title,
        image,
        duration,
        views,
        video: `${options.PORNHUB}/embed/${id}`,
      };
    })
    .get()
    // Filter out placeholder / ad entries
    .filter(
      (item) =>
        !item.link.includes("javascript:void(0)") &&
        !item.image?.startsWith("data:image")
    );

  if (results.length === 0) throw new Error("No results found");

  return {
    success: true,
    data:    results,
    source:  url,
  };
}
