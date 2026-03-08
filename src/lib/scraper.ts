import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config/index";
import { cleanText } from "./format";

// Simple in-memory cache (per cold-start)
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
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<string> {
  // Validate URL first — this is what causes "Invalid URL" errors
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL passed to fetchPage: "${url}"`);
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
      console.warn(`[fetchPage] attempt ${attempt}/${MAX_RETRIES} failed for ${url}: ${lastErr.message}`);
      if (attempt < MAX_RETRIES) await sleep(800 * attempt);
    }
  }

  throw new Error(`fetchPage failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
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
  texts(selector: string): string[] {
    return this.$(selector)
      .map((_i: any, el: any) => cleanText(this.$(el).text()))
      .get()
      .filter(Boolean);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs(selector: string, attribute: string): string[] {
    return this.$(selector)
      .map((_i: any, el: any) => this.$(el).attr(attribute) ?? "")
      .get()
      .filter(Boolean);
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

  extractJsString(name: string): string {
    try {
      const re = new RegExp(`var\\s+${name}\\s*=\\s*["']([^"'\\\\]*)["']`, "m");
      const match = this._html.match(re);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  scriptContents(): string[] {
    const scripts: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.$("script:not([src])").each((_i: any, el: any) => {
      const c = this.$(el).html() ?? "";
      if (c.trim()) scripts.push(c);
    });
    return scripts;
  }

  debugInfo(): Record<string, unknown> {
    const html = this._html;
    return {
      htmlLength:         html.length,
      pcVideoListItem:    this.$("li.pcVideoListItem").length,
      videoSearchResult:  this.$("#videoSearchResult").length,
      hasDataVideoVkey:   html.includes("data-video-vkey"),
      hasViewkey:         html.includes("viewkey"),
      hasFlashvars:       html.includes("flashvars_"),
      hasPcVideoListItem: html.includes("pcVideoListItem"),
      hasAgeGate:         html.includes("ageGate") || html.includes("accessAgeDisclaimer"),
      htmlStart:          html.slice(0, 300),
    };
  }
}
