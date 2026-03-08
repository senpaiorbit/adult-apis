import type { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { normalizeThumbnail, formatDuration, cleanText } from "../../../lib/format";
import { BASE_URLS } from "../../../config";
import { maybeError } from "../../../utils/modifier";
import { logger } from "../../../utils/logger";

/**
 * GET /pornhub/get?id=<viewkey>
 *
 * Returns full metadata for a single PornHub video.
 */
export async function getHandler(c: Context) {
  const id = c.req.query("id");

  if (!id) {
    return c.json(maybeError(false, "Query param `id` is required"), 400);
  }

  try {
    const url  = `${BASE_URLS.PORNHUB}/view_video.php?viewkey=${id}`;
    const html = await fetchPage(url);
    const doc  = new HtmlDoc(html);
    const $    = doc.raw;

    // ── Meta tags ──────────────────────────────────────────────
    const canonicalLink = doc.meta("og:url")       || url;
    const title         = doc.meta("og:title");
    const image         = normalizeThumbnail(doc.meta("og:image"));
    const videoUrl      = doc.meta("og:video:url");
    const durationSecs  = parseInt(doc.meta("video:duration") || "0", 10);
    const duration      = formatDuration(durationSecs);

    // ── DOM selectors ──────────────────────────────────────────
    const views    = cleanText($("div.views span.count").text());
    const rating   = cleanText($("div.ratingPercent span.percent").text());
    const upvote   = $("span.votesUp").attr("data-rating")   ?? "";
    const downvote = $("span.votesDown").attr("data-rating") ?? "";
    const uploaded = cleanText($("div.videoInfo").text());

    const tags: string[] = $("div.video-info-row a")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((_i: number, el: any) => cleanText($(el).text()))
      .get()
      .filter((t: string) => t && t !== "Suggest" && t !== " Suggest");

    const models: string[] = $("div.pornstarsWrapper.js-pornstarsWrapper a")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((_i: number, el: any) => $(el).attr("data-mxptext") ?? "")
      .get()
      .filter(Boolean);

    logger.info(`[pornhub/get] id=${id}`);

    return c.json({
      success: true,
      data: {
        id,
        title,
        image,
        duration,
        views,
        rating,
        uploaded,
        upvote,
        downvote,
        models,
        tags,
      },
      source: canonicalLink,
      assets: [videoUrl, image].filter(Boolean),
    });
  } catch (err) {
    const e = err as Error;
    logger.error(`[pornhub/get] ${e.message}`);
    return c.json(maybeError(false, e.message), 500);
  }
}
