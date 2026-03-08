import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config";
import { cleanText } from "./format";

// ─── In-memory cache & in-flight deduplication ───────────────────────────────

const fetchCache = new Map<string, string>();
const inFlight    = new Map<string, Promise<string>>();

// ─── fetchPage ────────────────────────────────────────────────────────────────

/**
 * Fetch raw HTML from a URL.
 * - Collapses duplicate slashes in the URL (preserves "://").
 * - Returns cached result on subsequent calls.
 * - Deduplicates concurrent requests for the same URL.
 * - Retries up to MAX_RETRIES times with incremental back-off.
 */
export async function fetchPage(url: string): Promise<string> {
  const normalized = url.replace(/(?<!:)\/\//g, "/");

  if (fetchCache.has(normalized)) return fetchCache.get(normalized)!;
  if (inFlight.has(normalized))   return inFlight.get(normalized)!;

  const promise = (async (): Promise<string> => {
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const res = await fetch(normalized, {
          headers: DEFAULT_HEADERS,
          signal:  controller.signal,
          redirect: "follow",
        });

        clearTimeout(timer);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        fetchCache.set(normalized, html);
        return html;
      } catch (err) {
        lastErr = err as Error;
        if (attempt < MAX_RETRIES) {
          await sleep(300 * attempt);
        }
      }
    }

    throw new Error(
      `fetchPage failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`
    );
  })();

  inFlight.set(normalized, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(normalized);
  }
}

// ─── HtmlDoc ──────────────────────────────────────────────────────────────────

/**
 * Thin wrapper around Cheerio that provides concise helper methods for
 * extracting text, attributes and meta tags without repeated boilerplate.
 */
export class HtmlDoc {
  private $: CheerioAPI;

  constructor(html: string) {
    this.$ = load(html);
  }

  /** Expose the raw Cheerio instance for advanced queries. */
  get raw(): CheerioAPI {
    return this.$;
  }

  /** Cleaned inner text of the first matching element. */
  text(selector: string): string {
    return cleanText(this.$(selector).first().text());
  }

  /** Attribute value of the first matching element. */
  attr(selector: string, attribute: string): string {
    return this.$(selector).first().attr(attribute) ?? "";
  }

  /**
   * Convenience: read a `<meta property="…">` or `<meta name="…">` tag.
   * Returns empty string when not found.
   */
  meta(key: string): string {
    return (
      this.$(`meta[property="${key}"]`).attr("content") ??
      this.$(`meta[name="${key}"]`).attr("content") ??
      ""
    );
  }

  /** Collect cleaned text from every matching element. */
  texts(selector: string): string[] {
    return this.$(selector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((_i: number, el: any) => cleanText(this.$(el).text()))
      .get()
      .filter(Boolean);
  }

  /** Collect attribute values from every matching element. */
  attrs(selector: string, attribute: string): string[] {
    return this.$(selector)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((_i: number, el: any) => this.$(el).attr(attribute) ?? "")
      .get()
      .filter(Boolean);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
