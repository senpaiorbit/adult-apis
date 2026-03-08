import { BASE_URL } from "../config";

/**
 * Strip newlines, collapse whitespace, trim.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/(\r\n|\n|\r|\t)/gm, " ")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strip ALL whitespace and newlines (for compact strings).
 */
export function stripWhitespace(raw: string): string {
  return raw.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, "");
}

/**
 * Resolve a potentially relative URL against the base URL.
 */
export function resolveUrl(href: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
}

/**
 * Normalise a thumbnail URL: strip query strings used for sizing,
 * and fall back to a placeholder if empty.
 */
export function normalizeThumbnail(src: string): string {
  if (!src) return "";
  try {
    const u = new URL(src.startsWith("//") ? `https:${src}` : src);
    // remove width/height resize params common on CDNs
    u.searchParams.delete("width");
    u.searchParams.delete("height");
    u.searchParams.delete("w");
    u.searchParams.delete("h");
    return u.toString();
  } catch {
    return src;
  }
}

/**
 * Convert seconds (number | string) → "Xmin, Ysec".
 */
export function secondsToDisplay(seconds: number | string): string {
  const s = Number(seconds) || 0;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}min, ${rem}sec`;
}

/**
 * Remove single-quotes from every string in an array.
 */
export function stripSingleQuotes(arr: string[]): string[] {
  return arr.map((s) => s.replace(/'/g, ""));
}
