/** Replace spaces with + for URL query strings */
export function spacer(str: string): string {
  return str.replace(/\s/g, "+");
}

/** Standard error envelope */
export function maybeError(success: boolean, message: string) {
  return { success, message };
}

/** Strip newlines / extra whitespace from HTML-derived strings */
export function removeHtmlTag(str: string): string {
  return str.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, "");
}

export function removeHtmlTagWithoutSpace(str: string): string {
  return str
    .replace(/(\r\n|\n|\r|\t)/gm, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert seconds → "Xmin, Ysec" */
export function secondToMinute(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${minutes}min, ${sec}sec`;
}
