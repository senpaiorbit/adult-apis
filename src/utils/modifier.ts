export function spacer(str: string): string {
  return str.replace(/\s/g, "+");
}

export function maybeError(success: boolean, message: string) {
  return { success, message };
}

export function isNumeric(val: string): boolean {
  return !isNaN(Number(val));
}

export function timeAgo(input: Date): string | undefined {
  const date = new Date(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatter: any = new Intl.RelativeTimeFormat("en");
  const ranges: Record<string, number> = {
    years: 3600 * 24 * 365, months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,   days: 3600 * 24,
    hours: 3600,             minutes: 60, seconds: 1,
  };
  const elapsed = (date.getTime() - Date.now()) / 1000;
  for (const key in ranges) {
    if (ranges[key] < Math.abs(elapsed)) {
      return formatter.format(Math.round(elapsed / ranges[key]), key) as string;
    }
  }
}
