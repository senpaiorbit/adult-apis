export const BASE_URLS = {
  PORNHUB:   "https://www.pornhub.org",
  XNXX:      "https://www.xnxx.com",
  XVIDEOS:   "https://www.xvideos.com",
  XHAMSTER:  "https://xhamster.com",
  SPANKBANG: "https://spankbang.party",
  EPORNER:   "https://www.eporner.com",
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language":           "en-US,en;q=0.5",
  "Accept-Encoding":           "gzip, deflate, br",
  "Connection":                "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest":            "document",
  "Sec-Fetch-Mode":            "navigate",
  "Sec-Fetch-Site":            "none",
  "Cache-Control":             "max-age=0",
};

export const FETCH_TIMEOUT = 15000;
export const MAX_RETRIES   = 3;
