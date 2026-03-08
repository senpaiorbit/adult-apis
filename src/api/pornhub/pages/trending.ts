import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText } from "../../../lib/format";
import { BASE_URLS } from "../../../config/index";
import { logger } from "../../../utils/logger";

interface VideoItem {
  id:        string;
  viewkey:   string;
  title:     string;
  thumb:     string;
  preview:   string;
  duration:  string;
  views:     string;
  uploader:  string;
  uploaderUrl: string;
  uploadedAgo: string;
  url:       string;
}

export async function trendingHandler(query: URLSearchParams): Promise<object> {
  const page = query.get("page") || "1";

  // Use /video endpoint (no sort param = "Recently Featured" which is the default trending)
  // For top-rated trending use ?o=tr, for most viewed ?o=mv
  const url  = `${BASE_URLS.PORNHUB}/video?page=${page}`;
  const html = await fetchPage(url);
  const $    = new HtmlDoc(html).raw;

  const results: VideoItem[] = [];

  // Selector from actual HTML: li.pcVideoListItem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("li.pcVideoListItem").each((_i: any, el: any) => {
    const $el = $(el);

    // viewkey from data attribute
    const viewkey = $el.attr("data-video-vkey") ?? "";
    const videoId = $el.attr("data-video-id")   ?? "";
    if (!viewkey) return;

    // href from the thumbnail anchor
    // <a href="/view_video.php?viewkey=xxx" ...>
    const href  = $el.find("a.linkVideoThumb").attr("href") ?? "";
    const fullUrl = href.startsWith("http")
      ? href
      : `${BASE_URLS.PORNHUB}${href}`;

    // Title from: span.title a  OR  a.linkVideoThumb[title]
    const title = cleanText($el.find(".thumbnail-info .title a").first().text())
               || $el.find("a.linkVideoThumb").attr("title")
               || "";

    // Thumbnail: img[data-mediumthumb] is the best quality available without auth
    const img = $el.find("img.js-videoThumb");
    const thumb = img.attr("data-mediumthumb")
               || img.attr("src")
               || "";

    // Preview webm (hover preview)
    const preview = img.attr("data-mediabook") ?? "";

    // Duration: <var class="duration">15:09</var>
    const duration = cleanText($el.find("var.duration").text());

    // Views: <span class="views"><var>159K</var> views</span>
    const views = cleanText($el.find(".videoDetailsBlock .views var").text());

    // Uploader — could be a model or channel
    // Model: span.usernameBadgesWrapper a
    // Channel: .usernameWrap a.bolded
    const uploaderEl = $el.find(".usernameWrap");
    const uploader   = cleanText(
      uploaderEl.find(".usernameBadgesWrapper a").first().text() ||
      uploaderEl.find("a.bolded").first().text()
    );
    const uploaderHref = uploaderEl.find(".usernameBadgesWrapper a, a.bolded").first().attr("href") ?? "";
    const uploaderUrl  = uploaderHref.startsWith("http")
      ? uploaderHref
      : `${BASE_URLS.PORNHUB}${uploaderHref}`;

    // Uploaded ago: <var class="added">56 years ago</var>
    const uploadedAgo = cleanText($el.find("var.added").text());

    results.push({
      id:          videoId,
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
    });
  });

  logger.info(`[pornhub/trending] page=${page} results=${results.length}`);

  return {
    success: true,
    page:    Number(page),
    total:   results.length,
    data:    results,
  };
}
