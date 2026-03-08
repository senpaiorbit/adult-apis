export function cleanText(str: string): string {
  return str
    .replace(/[\r\n\t]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveUrl(path: string, base: string): string {
  if (!path) return "";
  try { return new URL(path, base).href; } catch { return path; }
}

export function normalizeThumbnail(url: string): string {
  if (!url) return "";
  return url.replace(/^\/\//, "https://").replace(/^http:/, "https:");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function encodeQuery(val: string): string {
  return encodeURIComponent(val.trim()).replace(/%20/g, "+");
}
