import { fetchJSON } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

const API = BASE_URLS.PORNHUB_API;
const PH  = BASE_URLS.PORNHUB;

export async function getHandler(query: URLSearchParams): Promise<object> {
  const id = query.get("id");
  if (!id) return maybeError(false, "Query param `id` is required");

  // PH Webmasters API: video by ID
  const url = `${API}/video_by_id?id=${encodeURIComponent(id)}`;
  logger.info(`[pornhub/get] fetching API: ${url}`);

  let data: any;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pornhub/get] fetch failed: ${msg}`);
    return { success: false, message: msg };
  }

  // Response shape: { video: { id, title, thumb, thumbs, duration, views, ... } }
  const v = data?.video ?? data;

  if (!v || (!v.title && !v.id)) {
    return {
      success: false,
      message: "Video not found or API returned empty data",
      _raw:    data,
    };
  }

  const viewkey = v.id ?? id;

  // mediaDefinitions: array of { quality, videoUrl } — get highest quality
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaDefs: any[] = v.mediaDefinitions ?? [];
  const videoUrl =
    mediaDefs.find((m: any) => m.quality === "1080")?.videoUrl ??
    mediaDefs.find((m: any) => m.quality === "720")?.videoUrl  ??
    mediaDefs.find((m: any) => m.quality === "480")?.videoUrl  ??
    mediaDefs[mediaDefs.length - 1]?.videoUrl ?? "";

  logger.info(`[pornhub/get] id=${id} title="${v.title}" views="${v.views}"`);

  return {
    success: true,
    data: {
      id:          viewkey,
      viewkey,
      title:       v.title        ?? "",
      thumb:       v.thumb        ?? v.defaultThumb?.src ?? "",
      thumbs:      v.thumbs       ?? [],
      preview:     v.preview      ?? "",
      videoUrl,
      mediaDefinitions: mediaDefs,
      duration:    v.duration     ?? "",
      views:       v.views        ?? "",
      rating:      v.rating       ?? "",
      upvote:      v.ratings      ?? "",
      votesUp:     v.votes?.up    ?? "",
      votesDown:   v.votes?.down  ?? "",
      publishDate: v.publish_date ?? "",
      description: v.description  ?? "",
      channel:     v.author?.username ?? "",
      channelUrl:  v.author?.url       ?? "",
      models:      (v.pornstars ?? []).map((p: any) => p.pornstar?.name ?? p.name ?? p),
      tags:        (v.tags ?? []).map((t: any) => t.tag_name ?? t.name ?? t),
      categories:  (v.categories ?? []).map((c: any) => c.category ?? c.name ?? c),
      url:         v.url ?? `${PH}/view_video.php?viewkey=${viewkey}`,
      segment:     v.segment ?? "",
    },
    source: url,
  };
}
