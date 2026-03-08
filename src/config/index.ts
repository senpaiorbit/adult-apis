// PornHub Webmasters API - free public JSON API, no key required
// Docs: https://www.pornhub.com/webmasters
export const BASE_URLS = {
  // JSON API - returns clean structured data, no HTML scraping needed
  PORNHUB_API:  "https://www.pornhub.com/webmasters",
  // Canonical video URL base (for building watch links)
  PORNHUB:      "https://www.pornhub.com",
  XNXX:         "https://www.xnxx.com",
  XVIDEOS:      "https://www.xvideos.com",
  XHAMSTER:     "https://xhamster.com",
  SPANKBANG:    "https://spankbang.party",
  EPORNER:      "https://www.eporner.com",
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection":      "keep-alive",
};

export const FETCH_TIMEOUT = 20000;
export const MAX_RETRIES   = 2;
