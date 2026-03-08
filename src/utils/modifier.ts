/**
 * URL-safe spacer — replace whitespace with "+".
 */
export function spacer(str: string): string {
  return str.replace(/\s/g, "+");
}

/**
 * Build a standard error payload.
 *
 * @example
 * c.json(maybeError(false, "Not found"), 404)
 */
export function maybeError(success: boolean, message: string) {
  return { success, message };
}

/**
 * Returns true when the string represents a valid number.
 */
export function isNumeric(val: string): boolean {
  return !isNaN(Number(val));
}

/**
 * Convert a Date to a human-readable "time ago" string.
 * e.g. new Date("2023-01-01") → "2 years ago"
 */
export function timeAgo(input: Date): string | undefined {
  const date = new Date(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatter: any = new Intl.RelativeTimeFormat("en");

  const ranges: Record<string, number> = {
    years:   3600 * 24 * 365,
    months:  3600 * 24 * 30,
    weeks:   3600 * 24 * 7,
    days:    3600 * 24,
    hours:   3600,
    minutes: 60,
    seconds: 1,
  };

  const secondsElapsed = (date.getTime() - Date.now()) / 1000;

  for (const key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / ranges[key];
      return formatter.format(Math.round(delta), key) as string;
    }
  }

  return undefined;
}
