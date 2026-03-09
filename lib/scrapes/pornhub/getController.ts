import { load } from "cheerio";
import { fetchBody } from "../../fetcher";
import { removeHtmlTagWithoutSpace, secondToMinute } from "../../modifier";
import type { IVideoData } from "../../interfaces";

/**
 * Scrape a single Pornhub video page.
 * @param url  Full URL, e.g. https://pornhub.org/view_video.php?viewkey=ph63c4e1dc48fe7
 */
export async function scrapePornhubGet(url: string): Promise<IVideoData> {
  const buffer = await fetchBody(url);
  const $ = load(buffer);

  const link    = $("link[rel='canonical']").attr("href") || "None";
  const id      = link.split("=")[1] || "None";
  const title   = $("meta[property='og:title']").attr("content") || "None";
  const image   = $("meta[property='og:image']").attr("content") || "None";
  const durSecs = $("meta[property='video:duration']").attr("content") || "0";
  const views   = $("div.views > span.count").text() || "None";
  const rating  = $("div.ratingPercent > span.percent").text() || "None";
  const videoInfo = $("div.videoInfo").text() || "None";
  const upVote   = $("span.votesUp").attr("data-rating") || "None";
  const downVote = $("span.votesDown").attr("data-rating") || "None";
  const video    = $("meta[property='og:video:url']").attr("content") || "None";

  let tags = $("div.video-info-row")
    .find("a")
    .map((_, el) => $(el).text())
    .get();
  tags.shift(); // first entry is always the category label — drop it
  tags = tags
    .map((t) => removeHtmlTagWithoutSpace(t))
    .filter((t) => t !== "Suggest" && t !== " Suggest");

  const models = $("div.pornstarsWrapper.js-pornstarsWrapper")
    .find("a")
    .map((_, el) => $(el).attr("data-mxptext") ?? "")
    .get()
    .filter(Boolean);

  return {
    success: true,
    data: {
      title:     removeHtmlTagWithoutSpace(title),
      id,
      image,
      duration:  secondToMinute(Number(durSecs)),
      views,
      rating,
      uploaded:  videoInfo,
      upvoted:   upVote,
      downvoted: downVote,
      models,
      tags,
    },
    assets: [video, image],
    source: link,
  };
}
