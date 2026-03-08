import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config";
import { cleanText } from "./format";

// ── In-memory cache & deduplication ─────────────────────────────────────────
const fetchCache = new Map<string, string>();
const inFlight   = new Map<string, Promise<string>>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch raw HTML with caching, deduplication and retry back-off.
 * Uses native fetch (Node 18+ built-in — Vercel Node 20.x supports it).
 */
export async function fetchPage(rawUrl: string): Promise<string> {
  // collapse duplicate slashes while preserving "://"
  const url = rawUrl.replace(/([^:])\/\/+/g, "$1/");

  if (fetchCache.has(url)) return fetchCache.get(url)!;
  if (inFlight.has(url))   return inFlight.get(url)!;

  const promise = (async (): Promise<string> => {
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const res = await fetch(url, {
          headers: DEFAULT_HEADERS,
          signal:  controller.signal,
          redirect: "follow",
        });

        clearTimeout(timer);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
        }

        const html = await res.text();
        fetchCache.set(url, html);
        return html;
      } catch (err) {
        lastErr = err as Error;
        console.warn(`[fetchPage] attempt ${attempt} failed: ${lastErr.message}`);
        if (attempt < MAX_RETRIES) await sleep(350 * attempt);
      }
    }

    throw new Error(
      `fetchPage gave up after ${MAX_RETRIES} attempts: ${lastErr?.message}`
    );
  })();

  inFlight.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(url);
  }
}

// ── HtmlDoc ──────────────────────────────────────────────────────────────────

export class HtmlDoc {
  private $: CheerioAPI;

  constructor(html: string) {
    this.$ = load(html);
  }

  get raw(): CheerioAPI {
    return this.$;
  }

  text(selector: string): string {
    return cleanText(this.$(selector).first().text());
  }

  attr(selector: string, attribute: string): string {
    return this.$(selector).first().attr(attribute) ?? "";
  }

  meta(key: string): string {
    return (
      this.$(`meta[property="${key}"]`).attr("content") ??
      this.$(`meta[name="${key}"]`).attr("content") ??
      ""
    );
  }

  texts(selector: string): string[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.$(selector)
      .map((_i: any, el: any) => cleanText(this.$(el).text()))
      .get()
      .filter(Boolean);
  }

  attrs(selector: string, attribute: string): string[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.$(selector)
      .map((_i: any, el: any) => this.$(el).attr(attribute) ?? "")
      .get()
      .filter(Boolean);
  }
}
