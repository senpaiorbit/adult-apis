import { cleanText, resolveUrl } from "./format";

export interface VideoItem {
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
export function parseVideoCard($: any, el: any, baseUrl: string): VideoItem | null {
  const $el = $(el);

  // --- viewkey ---
  let viewkey  = $el.attr("data-video-vkey") ?? "";
  const videoId = $el.attr("data-video-id")  ?? "";

  if (!viewkey) {
    const href = $el.find("a[href*='viewkey=']").first().attr("href") ?? "";
    const m = href.match(/viewkey=([a-zA-Z0-9]+)/);
    if (m) viewkey = m[1];
  }

  // Skip mock/blurred items and ad slots
  if (!viewkey) return null;

  // --- URL ---
  const rawHref =
    $el.find("a.linkVideoThumb").first().attr("href") ??
    $el.find("a[href*='viewkey=']").first().attr("href") ??
    "";
  const fullUrl = rawHref
    ? resolveUrl(rawHref, baseUrl)
    : `${baseUrl}/view_video.php?viewkey=${viewkey}`;

  // --- Title ---
  const title =
    $el.find("a.linkVideoThumb").first().attr("title") ||
    $el.find("a[href*='viewkey=']").first().attr("title") ||
    cleanText($el.find("span.title a").first().text()) ||
    cleanText($el.find(".vidTitleWrapper .title a").first().text()) ||
    cleanText($el.find("a.thumbnailTitle").first().text()) ||
    "";

  // --- Thumbnail / Preview ---
  const imgEl =
    $el.find("img.js-videoThumb").first().length  ? $el.find("img.js-videoThumb").first()  :
    $el.find("img.thumb").first().length           ? $el.find("img.thumb").first()           :
    $el.find("img[data-mediumthumb]").first().length ? $el.find("img[data-mediumthumb]").first() :
    $el.find("img").first();

  const thumb =
    imgEl.attr("data-mediumthumb") ||
    imgEl.attr("data-thumb_url")   ||
    imgEl.attr("data-src")         ||
    imgEl.attr("src")              ||
    "";

  const preview = imgEl.attr("data-mediabook") || imgEl.attr("data-preview") || "";

  // --- Duration ---
  const duration =
    cleanText($el.find("var.duration").first().text()) ||
    cleanText($el.find(".marker-overlays var").first().text()) ||
    cleanText($el.find(".duration").first().text()) ||
    "";

  // --- Views ---
  const views =
    cleanText($el.find("span.views var").first().text()) ||
    cleanText($el.find(".views var").first().text()) ||
    "";

  // --- Uploader ---
  const uploaderWrap = $el.find(".usernameWrap").first();
  const uploaderAnchor = uploaderWrap.find("a.bolded").first().length
    ? uploaderWrap.find("a.bolded").first()
    : uploaderWrap.find("a").first();

  const uploader     = cleanText(uploaderAnchor.text()) || "";
  const uploaderHref = uploaderAnchor.attr("href") ?? "";
  const uploaderUrl  = uploaderHref ? resolveUrl(uploaderHref, baseUrl) : "";

  // --- Time ago ---
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

// Try multiple selectors to find video list items on a page
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractVideoCards($: any, baseUrl: string): VideoItem[] {
  const results: VideoItem[] = [];
  const seen = new Set<string>();

  const selectors = [
    "#videoSearchResult li.pcVideoListItem",
    "ul.videos li.pcVideoListItem",
    "li.pcVideoListItem",
    "li[data-video-vkey]",
  ];

  for (const selector of selectors) {
    if (results.length > 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(selector).each((_i: any, el: any) => {
      const item = parseVideoCard($, el, baseUrl);
      if (item && !seen.has(item.viewkey)) {
        seen.add(item.viewkey);
        results.push(item);
      }
    });
  }

  return results;
}
