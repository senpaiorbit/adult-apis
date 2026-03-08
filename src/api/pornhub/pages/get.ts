import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { formatDuration, cleanText, resolveUrl } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

const PH = BASE_URLS.PORNHUB; // https://www.pornhub.org

export async function getHandler(query: URLSearchParams): Promise<object> {
  const id = query.get("id");
  if (!id) return maybeError(false, "Query param `id` is required");

  const url = `${PH}/view_video.php?viewkey=${id}`;
  logger.info(`[pornhub/get] fetching: ${url}`);

  let html: string;
  try {
    html = await fetchPage(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pornhub/get] fetch failed: ${msg}`);
    return { success: false, message: msg };
  }

  const doc = new HtmlDoc(html);
  const $   = doc.raw;

  // Strategy 1: flashvars JS object (most reliable)
  const flashvars = doc.extractJsVar("flashvars_");
  logger.info(`[pornhub/get] flashvars found: ${!!flashvars}`);

  let title       = "";
  let image       = "";
  let videoUrl    = "";
  let duration    = "";
  let description = "";

  if (flashvars) {
    title    = flashvars.video_title    ?? flashvars.title    ?? "";
    image    = flashvars.image_url      ?? flashvars.image    ?? "";
    videoUrl =
      flashvars.mediaDefinitions?.[0]?.videoUrl ??
      flashvars.link_url  ??
      flashvars.video_url ??
      "";
    duration = flashvars.video_duration
      ? formatDuration(parseInt(String(flashvars.video_duration), 10))
      : "";
    description = flashvars.video_description ?? "";
  }

  // Strategy 2: meta tags fallback
  if (!title)    title    = doc.meta("og:title");
  if (!image)    image    = doc.meta("og:image");
  if (!videoUrl) videoUrl = doc.meta("og:video:url") || doc.meta("og:video");

  if (!duration) {
    const raw = doc.meta("video:duration");
    duration = raw
      ? formatDuration(parseInt(raw, 10))
      : cleanText($(".durationBadge").first().text()) ||
        cleanText($("span.duration").first().text())  ||
        cleanText($("var.duration").first().text())   ||
        "";
  }

  // Strategy 3: DOM fallbacks
  if (!title) {
    title =
      cleanText($("h1.title").first().text()) ||
      cleanText($(".title-container h1").first().text()) ||
      "";
  }

  // Views
  const views =
    cleanText($(".videoInfoBlock .views span.count").text()) ||
    cleanText($("div.views span.count").text())               ||
    cleanText($(".views .count").text())                      ||
    "";

  // Rating
  const rating =
    cleanText($(".ratingPercent span.percent").text()) ||
    cleanText($(".ratingPercent").text())               ||
    "";

  // Votes
  const upvote   = $("span.votesUp").attr("data-rating")   ?? "";
  const downvote = $("span.votesDown").attr("data-rating") ?? "";

  // Upload date
  const uploadDate =
    cleanText($(".uploadDate").text())              ||
    cleanText($("div.videoInfoBlock .date").text()) ||
    doc.meta("uploadDate")                          ||
    "";

  // Tags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: string[] = $(
    ".tagsWrapper a, .categoriesWrapper a, .categoriesWrap a"
  )
    .map((_i: any, el: any) => cleanText($(el).text()))
    .get()
    .filter((t: string) => t && t !== "Suggest" && t.length > 0);

  // Models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models: string[] = $(
    ".pornstarsWrapper a, .modelWrapper a, .pornstarsWrap a, .modelsWrapper a"
  )
    .map((_i: any, el: any) => cleanText($(el).text()))
    .get()
    .filter(Boolean);

  // Channel / uploader
  const channelEl =
    $(".userInfo .userNameWrap a, .channelInfo a, .usernameBadgesWrapper a").first();
  const channel     = cleanText(channelEl.text());
  const channelHref = channelEl.attr("href") ?? "";
  const channelUrl  = channelHref ? resolveUrl(channelHref, PH) : "";

  logger.info(`[pornhub/get] id=${id} title="${title}" views="${views}"`);

  return {
    success: true,
    data: {
      id,
      viewkey:    id,
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
      channel,
      channelUrl,
      models: [...new Set(models)],
      tags:   [...new Set(tags)],
    },
    source: url,
    ...((!title && !image) ? { _debug: doc.debugInfo() } : {}),
  };
}
