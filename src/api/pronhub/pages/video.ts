import { Context } from "hono";
import { fetchPage, HtmlDoc } from "../../../lib/scraper";
import { cleanText, normalizeThumbnail, resolveUrl, secondsToDisplay } from "../../../lib/format";
import { BASE_URL } from "../../../config";

export interface VideoDetail {
  success: boolean;
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  rating: string;
  upvotes: string;
  downvotes: string;
  uploadedAt: string;
  tags: string[];
  models: string[];
  streams: { quality: string; url: string }[];
  source: string;
}

export async function videoHandler(c: Context) {
  const viewkey = c.req.query("id");

  if (!viewkey) {
    return c.json({ success: false, message: "Query param `id` (viewkey) is required." }, 400);
  }

  try {
    const url = `${BASE_URL}/view_video.php?viewkey=${viewkey}`;
    const html = await fetchPage(url);
    const doc = new HtmlDoc(html);

    const canonical = doc.attr("link[rel]", "href"); // rel="canonical"
    const id = canonical.split("=")[1] ?? viewkey;

    const title = cleanText(doc.attr('meta[property="og:title"]', "content"));
    const description = cleanText(doc.attr('meta[name="description"]', "content"));
    const thumbnail = normalizeThumbnail(doc.attr('meta[property="og:image"]', "content"));
    const rawDuration = doc.attr('meta[property="video:duration"]', "content") || "0";
    const duration = secondsToDisplay(rawDuration);

    // Views — inside <span class="count">
    const views = cleanText(doc.text('span[class="count"]'));

    // Rating — inside <span class="percent">
    const rating = cleanText(doc.text('span[class="percent"]'));

    // Votes
    const upvotes = doc.extract(/data-rating="([^"]+)"[^>]*class="[^"]*votesUp/) ||
      doc.extract(/class="[^"]*votesUp[^"]*"[^>]*data-rating="([^"]+)"/);
    const downvotes = doc.extract(/data-rating="([^"]+)"[^>]*class="[^"]*votesDown/) ||
      doc.extract(/class="[^"]*votesDown[^"]*"[^>]*data-rating="([^"]+)"/);

    // Upload date
    const uploadedAt = cleanText(doc.extract(/Added:\s*<\/span>\s*([^<]+)/));

    // Tags — anchors inside .tagsWrapper or .video-info-row
    const tagEls = doc.extractAll(
      /class="[^"]*tagsWrapper[^"]*"[\s\S]*?<\/[^>]+>([\s\S]*?)<\/[^>]+>/
    );
    const tags = doc
      .texts("a[class]")
      .map(cleanText)
      .filter((t) => t.length > 0 && t !== "Suggest" && !t.includes("Suggest"))
      .slice(0, 30);

    // Model names
    const models = doc.attrs("span[data-mxptext]", "data-mxptext").filter(Boolean);

    // Video streams from flashvars / player config embedded in <script>
    const flashvars = doc.extract(/flashvars_\d+\s*=\s*(\{[\s\S]+?\});/);
    const streams: { quality: string; url: string }[] = [];

    if (flashvars) {
      try {
        const parsed = JSON.parse(flashvars) as Record<string, unknown>;
        const mediaDefinitions = parsed.mediaDefinitions as
          | { quality?: string; videoUrl?: string; defaultQuality?: boolean }[]
          | undefined;

        if (Array.isArray(mediaDefinitions)) {
          for (const def of mediaDefinitions) {
            if (def.videoUrl && def.quality) {
              streams.push({
                quality: String(def.quality),
                url: String(def.videoUrl),
              });
            }
          }
        }
      } catch {
        // flashvars parse failed — no streams available
      }
    }

    const response: VideoDetail = {
      success: true,
      id,
      title,
      description,
      thumbnail,
      duration,
      views,
      rating,
      upvotes: cleanText(upvotes),
      downvotes: cleanText(downvotes),
      uploadedAt,
      tags,
      models,
      streams,
      source: canonical || url,
    };

    return c.json(response);
  } catch (err) {
    const e = err as Error;
    return c.json({ success: false, message: e.message }, 500);
  }
}
