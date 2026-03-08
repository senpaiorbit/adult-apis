import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { formatDuration, cleanText } from "../../../lib/format";
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

  // --- Meta tags (most reliable for video page) ---
  const title    = doc.meta("og:title")     || cleanText($("h1.title").first().text());
  const image    = doc.meta("og:image");
  const videoUrl = doc.meta("og:video:url") || doc.meta("og:video");

  // Duration — from meta or from <span class="duration"> on the page
  const durationRaw = doc.meta("video:duration");
  const duration    = durationRaw
    ? formatDuration(parseInt(durationRaw, 10))
    : cleanText($("span.duration").first().text()) || cleanText($("var.duration").first().text());

  // Views: <span class="count">xxx</span> inside .views
  const views = cleanText($(".videoInfoBlock .views span.count").text())
             || cleanText($("div.views span.count").text());

  // Rating percentage: .ratingPercent span
  const rating = cleanText($(".ratingPercent span.percent").text())
              || cleanText($(".ratingPercent").text());

  // Votes
  const upvote   = $("span.votesUp").attr("data-rating")   ?? "";
  const downvote = $("span.votesDown").attr("data-rating") ?? "";

  // Upload date / info block
  // <div class="videoInfoBlock"> ... <div class="uploadDate">...</div>
  const uploadDate = cleanText($(".uploadDate").text())
                  || cleanText($("div.videoInfoBlock .date").text());

  // Tags: <a> inside .tagsWrapper or .video-info-row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: string[] = $(".tagsWrapper a, .video-info-row a, div.categoriesWrapper a")
    .map((_i: any, el: any) => cleanText($(el).text()))
    .get()
    .filter((t: string) => t && t !== "Suggest" && t.length > 0);

  // Models / pornstars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models: string[] = $(".pornstarsWrapper a, .pcVideoListItem .usernameWrap a")
    .map((_i: any, el: any) => cleanText($(el).text()))
    .get()
    .filter(Boolean);

  // Description from meta
  const description = doc.meta("og:description");

  logger.info(`[pornhub/get] id=${id} title="${title}"`);

  return {
    success: true,
    data: {
      id,
      viewkey:     id,
      title,
      image,
      videoUrl,
      duration,
      views,
      rating,
      upvote,
      downvote,
      uploadDate,
      description,
      models:  [...new Set(models)],
      tags:    [...new Set(tags)],
    },
    source: url,
    assets: [videoUrl, image].filter(Boolean),
  };
}
