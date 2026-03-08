import { fetchJSON } from "../../../lib/scraper";
import { BASE_URLS } from "../../../config/index";

const API = BASE_URLS.PORNHUB_API;

export async function debugHandler(query: URLSearchParams): Promise<object> {
  // Test all API endpoints
  const results: Record<string, unknown> = {};

  // Test search
  try {
    const searchUrl = `${API}/search?search=test&page=1&ordering=mostviewed`;
    const data = await fetchJSON(searchUrl);
    results.search = {
      ok:     true,
      url:    searchUrl,
      count:  data?.count,
      videos: data?.videos?.length ?? 0,
      sample: data?.videos?.[0]?.video?.title ?? data?.videos?.[0]?.title ?? null,
    };
  } catch (e) {
    results.search = { ok: false, error: String(e) };
  }

  // Test video_by_id
  try {
    const videoUrl = `${API}/video_by_id?id=ph5f4e934f5de3d`;
    const data = await fetchJSON(videoUrl);
    results.video_by_id = {
      ok:    true,
      url:   videoUrl,
      title: data?.video?.title ?? null,
      id:    data?.video?.id    ?? null,
    };
  } catch (e) {
    results.video_by_id = { ok: false, error: String(e) };
  }

  return { success: true, api: API, endpoints: results };
}
