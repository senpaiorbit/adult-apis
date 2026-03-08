import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, resolveUrl } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
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
function parseVideoCard($: any, el: any, baseUrl: string): VideoItem | null {
  const $el = $(el);

  // --- viewkey / id ---
  // Real HTML: <li class="pcVideoListItem" data-video-vkey="ph5e946908bdbfc" data-video-id="303279232">
  let viewkey = $el.attr("data-video-vkey") ?? "";
  const videoId = $el.attr("data-video-id") ?? "";

  if (!viewkey) {
    const href = $el.find("a[href*='viewkey=']").first().attr("href") ?? "";
    const m = href.match(/viewkey=([a-zA-Z0-9]+)/);
    if (m) viewkey = m[1];
  }

  if (!viewkey) return null;

  // --- URL ---
  // Real HTML: <a href="/view_video.php?viewkey=..." class="... linkVideoThumb ...">
  const rawHref =
    $el.find("a.linkVideoThumb").first().attr("href") ??
    $el.find("a[href*='viewkey=']").first().attr("href") ??
    "";
  const fullUrl = rawHref
    ? resolveUrl(rawHref, baseUrl)
    : `${baseUrl}/view_video.php?viewkey=${viewkey}`;

  // --- Title ---
  // Real HTML: <a href="..." title="BTS - Prepping for the Big Scrub xo" class="... linkVideoThumb ...">
  const title =
    $el.find("a.linkVideoThumb").first().attr("title") ||
    $el.find("a[href*='viewkey=']").first().attr("title") ||
    cleanText($el.find("span.title a").first().text()) ||
    cleanText($el.find(".vidTitleWrapper .title a").first().text()) ||
    "";

  // --- Thumbnail ---
  // Real HTML: <img src="..." data-mediumthumb="..." data-mediabook="..." class="... js-videoThumb ...">
  const imgEl =
    $el.find("img.js-videoThumb").first().length  ? $el.find("img.js-videoThumb").first() :
    $el.find("img.thumb").first().length           ? $el.find("img.thumb").first()          :
    $el.find("img").first();

  const thumb =
    imgEl.attr("data-mediumthumb") ||
    imgEl.attr("data-thumb_url")   ||
    imgEl.attr("data-src")         ||
    imgEl.attr("src")              ||
    "";

  // Real HTML: data-mediabook="https://kw.phncdn.com/.../180P_225K_....webm?..."
  const preview = imgEl.attr("data-mediabook") || imgEl.attr("data-preview") || "";

  // --- Duration ---
  // Real HTML: <var class="bgShadeEffect duration tooltipTrig">2:16</var>
  const duration =
    cleanText($el.find("var.duration").first().text()) ||
    cleanText($el.find(".marker-overlays var").first().text()) ||
    "";

  // --- Views ---
  // Real HTML: <span class="views"><i class="..."></i><var>18.5K</var></span>
  const views =
    cleanText($el.find("span.views var").first().text()) ||
    cleanText($el.find(".views var").first().text()) ||
    "";

  // --- Uploader ---
  // Real HTML (channel): <div class="usernameWrap"><a href="/channels/scrubhub" class="bolded">Scrubhub</a></div>
  // Real HTML (model):   <div class="usernameWrap"><a href="/model/ryancreamer">RyanCreamer</a></div>
  const uploaderWrap   = $el.find(".usernameWrap").first();
  const uploaderAnchor = uploaderWrap.find("a.bolded").first().length
    ? uploaderWrap.find("a.bolded").first()
    : uploaderWrap.find("a").first();
  const uploader    = cleanText(uploaderAnchor.text()) || "";
  const uploaderHref = uploaderAnchor.attr("href") ?? "";
  const uploaderUrl  = uploaderHref ? resolveUrl(uploaderHref, baseUrl) : "";

  // --- Time ago ---
  // Real HTML: <var class="added">5 years ago</var>
  const uploadedAgo = cleanText($el.find("var.added").first().text()) || "";

  return {
    id: videoId || viewkey,
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

export async function searchHandler(query: URLSearchParams): Promise<object> {
  const q    = query.get("q");
  const page = query.get("page") || "1";
  if (!q) return maybeError(false, "Query param `q` is required");

  const baseUrl = BASE_URLS.PORNHUB_INTL;
  const url = `${baseUrl}/video/search?search=${encodeURIComponent(q.trim())}&p=${page}`;
  logger.info(`[pornhub/search] fetching: ${url}`);

  const html = await fetchPage(url);
  const doc  = new HtmlDoc(html);
  const $    = doc.raw;

  const results: VideoItem[] = [];

  // Search page container: #videoSearchResult li.pcVideoListItem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("#videoSearchResult li.pcVideoListItem").each((_i: any, el: any) => {
    const item = parseVideoCard($, el, baseUrl);
    if (item) results.push(item);
  });

  // Fallback: any li.pcVideoListItem on the page
  if (results.length === 0) {
    logger.warn("[pornhub/search] #videoSearchResult empty, trying li.pcVideoListItem");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $("li.pcVideoListItem").each((_i: any, el: any) => {
      const item = parseVideoCard($, el, baseUrl);
      if (item) results.push(item);
    });
  }

  // Fallback: li[data-video-vkey]
  if (results.length === 0) {
    logger.warn("[pornhub/search] li.pcVideoListItem empty, trying li[data-video-vkey]");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $("li[data-video-vkey]").each((_i: any, el: any) => {
      const item = parseVideoCard($, el, baseUrl);
      if (item) results.push(item);
    });
  }

  logger.info(`[pornhub/search] q="${q}" page=${page} total results=${results.length}`);

  return {
    success: true,
    query:   q,
    page:    Number(page),
    total:   results.length,
    data:    results,
    ...(results.length === 0 ? {
      _debug: {
        url,
        htmlLength:         html.length,
        hasAgeGate:         html.includes("accessAgeDisclaimer"),
        hasPcVideoListItem: html.includes("pcVideoListItem"),
        hasViewkey:         html.includes("viewkey"),
        hasSearchResult:    html.includes("videoSearchResult"),
        htmlSnippet:        html.slice(0, 500),
      }
    } : {}),
  };
}
