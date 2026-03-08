type Level = "info" | "warn" | "error" | "debug";

function log(level: Level, ...args: unknown[]): void {
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  if (level === "error") console.error(prefix, ...args);
  else if (level === "warn") console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

export const logger = {
  info:  (...a: unknown[]) => log("info",  ...a),
  warn:  (...a: unknown[]) => log("warn",  ...a),
  error: (...a: unknown[]) => log("error", ...a),
  debug: (...a: unknown[]) => log("debug", ...a),
};
