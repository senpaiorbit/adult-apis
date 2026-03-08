import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { normalizeThumbnail, formatDuration, cleanText } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

export async function getHandler(query: URLSearchParams): Promise<object> {
  const id = query.get("id");
  if (!id) return maybeError(false, "Query param `id` is required");

  const url  = `${BASE_URLS.PORNHUB}/view_video.php?viewkey=${id}`;
  const html = await fetchPage(url);
  const doc  = new HtmlDoc(html);
  const $    = doc.raw;

  const canonicalLink = doc.meta("og:url") || url;
  const title         = doc.meta("og:title");
  const image         = normalizeThumbnail(doc.meta("og:image"));
  const videoUrl      = doc.meta("og:video:url");
  const duration      = formatDuration(parseInt(doc.meta("video:duration") || "0", 10));
  const views         = cleanText($("div.views span.count").text());
  const rating        = cleanText($("div.ratingPercent span.percent").text());
  const upvote        = $("span.votesUp").attr("data-rating")   ?? "";
  const downvote      = $("span.votesDown").attr("data-rating") ?? "";
  const uploaded      = cleanText($("div.videoInfo").text());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: string[] = $("div.video-info-row a")
    .map((_i: any, el: any) => cleanText($(el).text()))
    .get()
    .filter((t: string) => t && t !== "Suggest");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models: string[] = $("div.pornstarsWrapper.js-pornstarsWrapper a")
    .map((_i: any, el: any) => $(el).attr("data-mxptext") ?? "")
    .get()
    .filter(Boolean);

  logger.info(`[pornhub/get] id=${id}`);

  return {
    success: true,
    data: { id, title, image, duration, views, rating, uploaded, upvote, downvote, models, tags },
    source: canonicalLink,
    assets: [videoUrl, image].filter(Boolean),
  };
}
