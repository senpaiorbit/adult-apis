type LogLevel = "info" | "warn" | "error" | "debug";

function stamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, ...args: unknown[]): void {
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(prefix, ...args);
  } else if (level === "warn") {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const logger = {
  info:  (...args: unknown[]) => log("info",  ...args),
  warn:  (...args: unknown[]) => log("warn",  ...args),
  error: (...args: unknown[]) => log("error", ...args),
  debug: (...args: unknown[]) => log("debug", ...args),
};
