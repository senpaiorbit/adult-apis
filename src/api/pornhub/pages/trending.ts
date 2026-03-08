import { fetchJSON } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { logger } from "../../../utils/logger";

const API = BASE_URLS.PORNHUB_API;
const PH  = BASE_URLS.PORNHUB;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVideo(v: any): object {
  const viewkey = v.video?.id ?? v.id ?? "";
  return {
    id:          viewkey,
    viewkey,
    title:       v.video?.title        ?? v.title        ?? "",
    thumb:       v.video?.thumb        ?? v.thumb        ?? v.defaultThumb?.src ?? "",
    thumbs:      v.video?.thumbs       ?? v.thumbs       ?? [],
    preview:     v.video?.preview      ?? v.preview      ?? "",
    duration:    v.video?.duration     ?? v.duration     ?? "",
    views:       v.video?.views        ?? v.views        ?? "",
    rating:      v.video?.rating       ?? v.rating       ?? "",
    uploader:    v.video?.author?.username ?? v.author?.username ?? "",
    uploaderUrl: v.video?.author?.url  ?? v.author?.url  ?? "",
    tags:        (v.video?.tags ?? v.tags ?? []).map((t: any) => t.tag_name ?? t.name ?? t),
    categories:  (v.video?.categories ?? v.categories ?? []).map((c: any) => c.category ?? c.name ?? c),
    url:         v.video?.url ?? v.url ?? (viewkey ? `${PH}/view_video.php?viewkey=${viewkey}` : ""),
    publishDate: v.video?.publish_date ?? v.publish_date ?? "",
    segment:     v.video?.segment      ?? v.segment      ?? "",
  };
}

export async function trendingHandler(query: URLSearchParams): Promise<object> {
  const page     = query.get("page")     || "1";
  const period   = query.get("period")   || "weekly";  // weekly, monthly, alltime
  const category = query.get("category") || "";

  // PH Webmasters API - trending endpoint
  // ordering options: mostviewed, rating, newest, featured
  let url = `${API}/videos_by_category?page=${page}&ordering=mostviewed&hd=1&period=${period}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  // Fallback to straight search ordered by mostviewed
  const fallbackUrl = `${API}/search?search=&page=${page}&ordering=mostviewed&hd=1`;

  logger.info(`[pornhub/trending] fetching: ${url}`);

  let data: any;
  let usedUrl = url;

  try {
    data = await fetchJSON(url);
    // If no results, try fallback
    if (!data?.videos?.length) {
      logger.warn(`[pornhub/trending] primary returned no results, trying fallback`);
      data = await fetchJSON(fallbackUrl);
      usedUrl = fallbackUrl;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[pornhub/trending] primary failed (${msg}), trying fallback`);
    try {
      data = await fetchJSON(fallbackUrl);
      usedUrl = fallbackUrl;
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      return { success: false, message: `All trending attempts failed: ${msg} | ${msg2}` };
    }
  }

  const rawVideos: any[] = data?.videos ?? [];
  const results = rawVideos.map(normalizeVideo);

  logger.info(`[pornhub/trending] page=${page} results=${results.length}`);

  return {
    success: true,
    page:    Number(page),
    period,
    total:   data?.count ?? results.length,
    source:  usedUrl,
    data:    results,
    ...(results.length === 0 ? { _raw: data } : {}),
  };
}
