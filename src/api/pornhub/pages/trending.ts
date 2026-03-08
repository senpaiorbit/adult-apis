import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, resolveUrl } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { logger } from "../../../utils/logger";

interface VideoItem {
  id:          string;
  viewkey:     string;
  title:       string;
  thumb:       string;
  preview:     string;
  duration:    string;
  views:       string;
  uploader:    string;
  uploaderUrl: string;
  uploadedAgo: string;
  url:         string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVideoItem($: any, el: any): VideoItem | null {
  const $el = $(el);

  const viewkey = $el.attr("data-video-vkey") ?? "";
  const videoId = $el.attr("data-video-id")   ?? "";
  if (!viewkey) return null;

  const href    = $el.find("a.linkVideoThumb").attr("href") ?? "";
  const fullUrl = resolveUrl(href, BASE_URLS.PORNHUB);

  const title =
    $el.find("a.linkVideoThumb").attr("title") ||
    cleanText($el.find(".title a").first().text()) ||
    cleanText($el.find("span.title").first().text()) ||
    "";

  const img   = $el.find("img.js-videoThumb, img.thumb, img[data-thumb_url]").first();
  const thumb =
    img.attr("data-thumb_url")   ||
    img.attr("data-mediumthumb") ||
    img.attr("data-src")         ||
    img.attr("src")              ||
    "";

  const preview     = img.attr("data-mediabook") ?? "";
  const duration    = cleanText($el.find("var.duration").text());
  const views       =
    cleanText($el.find(".videoDetailsBlock .views var").text()) ||
    cleanText($el.find(".count").first().text())                ||
    "";

  const uploaderEl     = $el.find(".usernameWrap");
  const uploaderAnchor = uploaderEl.find(".usernameBadgesWrapper a, a.bolded, a").first();
  const uploader       = cleanText(uploaderAnchor.text());
  const uploaderHref   = uploaderAnchor.attr("href") ?? "";
  const uploaderUrl    = resolveUrl(uploaderHref, BASE_URLS.PORNHUB);
  const uploadedAgo    = cleanText($el.find("var.added").text());

  return {
    id: videoId,
    viewkey,
    title,
    thumb,
    preview,
    duration,
    views,
    uploader,
    uploaderUrl,
    uploadedAgo,
    url: fullUrl,
  };
}

export async function trendingHandler(query: URLSearchParams): Promise<object> {
  const page = query.get("page") || "1";

  // o=tr = top rated trending; o=mv = most viewed; o=tr is most "trending"-like
  const url  = `${BASE_URLS.PORNHUB}/video?o=tr&page=${page}`;
  logger.info(`[pornhub/trending] fetching: ${url}`);

  const html = await fetchPage(url);
  const $    = new HtmlDoc(html).raw;

  const rawCount = $("li.pcVideoListItem").length;
  logger.info(`[pornhub/trending] raw li.pcVideoListItem count: ${rawCount}`);

  const results: VideoItem[] = [];

  // Trending page uses #mostRecentVideosSection or just the global list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("li.pcVideoListItem").each((_i: any, el: any) => {
    const item = parseVideoItem($, el);
    if (item) results.push(item);
  });

  logger.info(`[pornhub/trending] page=${page} results=${results.length}`);

  return {
    success: true,
    page:    Number(page),
    total:   results.length,
    data:    results,
  };
}
