import * as https from "https";
import * as http from "http";
import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config/index";
import { cleanText } from "./format";

const fetchCache = new Map<string, string>();
const inFlight   = new Map<string, Promise<string>>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchRaw(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: DEFAULT_HEADERS, timeout: FETCH_TIMEOUT }, (res) => {
      // Follow redirects (up to 5)
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });
  });
}

export async function fetchPage(rawUrl: string): Promise<string> {
  const url = rawUrl.replace(/([^:])\/\/+/g, "$1/");

  if (fetchCache.has(url)) return fetchCache.get(url)!;
  if (inFlight.has(url))   return inFlight.get(url)!;

  const promise = (async (): Promise<string> => {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const html = await fetchRaw(url);
        fetchCache.set(url, html);
        return html;
      } catch (err) {
        lastErr = err as Error;
        console.warn(`[fetchPage] attempt ${attempt} failed: ${lastErr.message}`);
        if (attempt < MAX_RETRIES) await sleep(350 * attempt);
      }
    }
    throw new Error(`fetchPage failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
  })();

  inFlight.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(url);
  }
}

export class HtmlDoc {
  private $: CheerioAPI;

  constructor(html: string) {
    this.$ = load(html);
  }

  get raw(): CheerioAPI { return this.$; }

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
}
