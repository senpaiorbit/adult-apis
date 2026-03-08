import { fetchJSON } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

const API = BASE_URLS.PORNHUB_API;
const PH  = BASE_URLS.PORNHUB;

// PH Webmasters API video shape (partial)
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
    url:         v.video?.url          ?? v.url          ?? (viewkey ? `${PH}/view_video.php?viewkey=${viewkey}` : ""),
    publishDate: v.video?.publish_date ?? v.publish_date ?? "",
    segment:     v.video?.segment      ?? v.segment      ?? "",
  };
}

export async function searchHandler(query: URLSearchParams): Promise<object> {
  const q    = query.get("q");
  const page = query.get("page") || "1";
  const ordering = query.get("ordering") || "mostviewed"; // mostviewed, newest, rating

  if (!q) return maybeError(false, "Query param `q` is required");

  // PH Webmasters API search endpoint
  const url = `${API}/search?search=${encodeURIComponent(q.trim())}&page=${page}&ordering=${ordering}&hd=1`;
  logger.info(`[pornhub/search] fetching API: ${url}`);

  let data: any;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pornhub/search] fetch failed: ${msg}`);
    return { success: false, message: msg };
  }

  // Response shape: { videos: [ { video: {...} }, ... ], count: number }
  const rawVideos: any[] = data?.videos ?? [];
  const results = rawVideos.map(normalizeVideo);

  logger.info(`[pornhub/search] q="${q}" page=${page} results=${results.length}`);

  return {
    success:  true,
    query:    q,
    page:     Number(page),
    ordering,
    total:    data?.count ?? results.length,
    data:     results,
    ...(results.length === 0 ? { _raw: data } : {}),
  };
}
