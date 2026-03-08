import * as https from "https";
import * as http  from "http";
import * as zlib  from "zlib";
import { load, type CheerioAPI } from "cheerio";
import { DEFAULT_HEADERS, FETCH_TIMEOUT, MAX_RETRIES } from "../config/index";
import { cleanText } from "./format";

const fetchCache = new Map<string, string>();
const inFlight   = new Map<string, Promise<string>>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchRaw(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error("Too many redirects"));

    const lib = url.startsWith("https") ? https : http;

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   "GET",
      headers: {
        ...DEFAULT_HEADERS,
        "Host":    parsedUrl.hostname,
        "Referer": parsedUrl.origin + "/",
      },
      timeout: FETCH_TIMEOUT,
    };

    const req = lib.request(options, (res) => {
      // Follow redirects
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchRaw(next, redirects + 1).then(resolve).catch(reject);
      }

      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const chunks: Buffer[] = [];
      const encoding = res.headers["content-encoding"];

      res.on("data",  (c: Buffer) => chunks.push(c));
      res.on("error", reject);
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const done = (err: Error | null, buf: Buffer) => {
          if (err) return reject(err);
          resolve(buf.toString("utf8"));
        };

        if (encoding === "br") {
          zlib.brotliDecompress(raw, done);
        } else if (encoding === "gzip") {
          zlib.gunzip(raw, done);
        } else if (encoding === "deflate") {
          zlib.inflate(raw, (err, buf) => {
            // fallback to inflateRaw if inflate fails
            if (err) return zlib.inflateRaw(raw, done);
            done(null, buf);
          });
        } else {
          resolve(raw.toString("utf8"));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });

    req.end();
  });
}

export async function fetchPage(rawUrl: string): Promise<string> {
  const url = rawUrl.replace(/([^:])\/{2,}/g, "$1/");

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
        console.warn(`[fetchPage] attempt ${attempt}/${MAX_RETRIES} failed: ${lastErr.message}`);
        if (attempt < MAX_RETRIES) await sleep(600 * attempt);
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
  public $: CheerioAPI;

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
