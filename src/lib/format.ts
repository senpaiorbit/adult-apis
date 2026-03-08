/**
 * Strip newlines/tabs and collapse multiple spaces into one.
 */
export function cleanText(str: string): string {
  return str
    .replace(/[\r\n\t]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a possibly-relative URL against a base.
 * If path is already absolute, return it as-is.
 */
export function resolveUrl(path: string, base: string): string {
  if (!path) return "";
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

/**
 * Normalise thumbnail URLs: promote protocol-relative (//) to https
 * and force http → https.
 */
export function normalizeThumbnail(url: string): string {
  if (!url) return "";
  return url.replace(/^\/\//, "https://").replace(/^http:/, "https:");
}

/**
 * Convert raw seconds to mm:ss string (e.g. 185 → "3:05").
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * URL-encode a search query, replacing spaces with "+".
 */
export function encodeQuery(val: string): string {
  return encodeURIComponent(val.trim()).replace(/%20/g, "+");
}
