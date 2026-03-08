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
    if (redirects > 5) return reject(new Error("Too many redirects"));

    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          ...DEFAULT_HEADERS,
          // spoof a real browser referer
          Referer: new URL(url).origin + "/",
        },
        timeout: FETCH_TIMEOUT,
      },
      (res) => {
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

        const onData  = (c: Buffer) => chunks.push(c);
        const onEnd   = () => {
          const raw = Buffer.concat(chunks);
          if (encoding === "br") {
            zlib.brotliDecompress(raw, (err, decoded) => {
              if (err) return reject(err);
              resolve(decoded.toString("utf8"));
            });
          } else if (encoding === "gzip") {
            zlib.gunzip(raw, (err, decoded) => {
              if (err) return reject(err);
              resolve(decoded.toString("utf8"));
            });
          } else if (encoding === "deflate") {
            zlib.inflate(raw, (err, decoded) => {
              if (err) return reject(err);
              resolve(decoded.toString("utf8"));
            });
          } else {
            resolve(raw.toString("utf8"));
          }
        };

        res.on("data", onData);
        res.on("end",  onEnd);
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });
  });
}

export async function fetchPage(rawUrl: string): Promise<string> {
  // Normalise double-slashes except after protocol
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
        if (attempt < MAX_RETRIES) await sleep(500 * attempt);
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
