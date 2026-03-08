// pornhub.org is more scraper-friendly than pornhub.com (no geo-block, no age gate redirect)
export const BASE_URLS = {
  PORNHUB:      "https://www.pornhub.org",
  XNXX:         "https://www.xnxx.com",
  XVIDEOS:      "https://www.xvideos.com",
  XHAMSTER:     "https://xhamster.com",
  SPANKBANG:    "https://spankbang.party",
  EPORNER:      "https://www.eporner.com",
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language":           "en-US,en;q=0.9",
  "Accept-Encoding":           "gzip, deflate, br",
  "Connection":                "keep-alive",
  "DNT":                       "1",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest":            "document",
  "Sec-Fetch-Mode":            "navigate",
  "Sec-Fetch-Site":            "none",
  "Sec-Fetch-User":            "?1",
  "Cache-Control":             "max-age=0",
  "sec-ch-ua":                 '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile":          "?0",
  "sec-ch-ua-platform":        '"Windows"',
  "Cookie": "age_verified=1; platform=pc; cookieConsent=3; accessAgeDisclaimerPH=2; accessPH=1; lang=en",
};

export const FETCH_TIMEOUT = 20000;
export const MAX_RETRIES   = 2;
