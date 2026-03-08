import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config/index";
import { cleanText } from "./format";

const fetchCache = new Map<string, string>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRaw(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      method:   "GET",
      headers:  DEFAULT_HEADERS,
      redirect: "follow",
      signal:   controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<string> {
  try { new URL(url); } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }
  if (fetchCache.has(url)) return fetchCache.get(url)!;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const html = await fetchRaw(url);
      fetchCache.set(url, html);
      return html;
    } catch (err) {
      lastErr = err as Error;
      console.warn(`[fetchPage] attempt ${attempt}/${MAX_RETRIES} failed: ${lastErr.message}`);
      if (attempt < MAX_RETRIES) await sleep(800 * attempt);
    }
  }
  throw new Error(`fetchPage failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
}

// Fetch JSON directly (for API endpoints)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchJSON(url: string): Promise<any> {
  try { new URL(url); } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      try {
        const res = await fetch(url, {
          method:   "GET",
          headers:  { ...DEFAULT_HEADERS, "Accept": "application/json" },
          redirect: "follow",
          signal:   controller.signal,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
        }
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err as Error;
      console.warn(`[fetchJSON] attempt ${attempt}/${MAX_RETRIES} failed: ${lastErr.message}`);
      if (attempt < MAX_RETRIES) await sleep(800 * attempt);
    }
  }
  throw new Error(`fetchJSON failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
}

export class HtmlDoc {
  public $: CheerioAPI;
  private _html: string;

  constructor(html: string) {
    this.$ = load(html);
    this._html = html;
  }

  get raw(): CheerioAPI { return this.$; }
  get html(): string    { return this._html; }

  text(selector: string): string {
    return cleanText(this.$(selector).first().text());
  }

  attr(selector: string, attribute: string): string {
    return this.$(selector).first().attr(attribute) ?? "";
  }

  meta(property: string): string {
    return (
      this.$(`meta[property="${property}"]`).attr("content") ??
      this.$(`meta[name="${property}"]`).attr("content") ??
      ""
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractJsVar(prefix: string): any | null {
    try {
      const re = new RegExp(`var\\s+${prefix}[\\w]*\\s*=\\s*(\\{[\\s\\S]*?\\});`, "m");
      const match = this._html.match(re);
      if (!match) return null;
      // eslint-disable-next-line no-new-func
      return new Function(`return ${match[1]}`)();
    } catch {
      return null;
    }
  }

  debugInfo(): Record<string, unknown> {
    const html = this._html;
    return {
      htmlLength:  html.length,
      title:       this.$("title").text().slice(0, 100),
      hasViewkey:  html.includes("viewkey"),
      hasFlashvars: html.includes("flashvars_"),
      htmlStart:   html.slice(0, 400),
    };
  }
}
