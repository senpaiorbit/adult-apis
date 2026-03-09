import http from "http";
import https from "https";

const DEFAULT_HEADERS = {
  "User-Agent":
    process.env.USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

/** Fetch a URL as a Buffer, with up to `maxAttempts` retries. */
export async function fetchBody(
  url: string,
  maxAttempts = 3
): Promise<Buffer> {
  // Collapse accidental double-slashes (not in protocol)
  url = url.replace(/(?<!:)\/\//g, "/");

  const isHttps = url.startsWith("https");
  const lib = isHttps ? https : http;
  const agent = new lib.Agent({ keepAlive: true });

  let lastErr: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const req = lib.get(
          url,
          { headers: DEFAULT_HEADERS, agent, timeout: 10_000 },
          (res) => {
            // Follow redirects (up to 5 hops)
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              fetchBody(res.headers.location, maxAttempts)
                .then(resolve)
                .catch(reject);
              res.resume();
              return;
            }

            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode} for ${url}`));
              res.resume();
              return;
            }

            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          }
        );

        req.on("timeout", () => {
          req.destroy();
          reject(new Error(`Request timed out for ${url}`));
        });
        req.on("error", reject);
      });

      return buffer;
    } catch (err) {
      lastErr = err as Error;
      console.warn(`[fetchBody] Attempt ${attempt} failed – ${lastErr.message}`);
      if (attempt < maxAttempts) await delay(300 * attempt);
    }
  }

  throw new Error(
    `Failed to fetch after ${maxAttempts} attempts: ${lastErr?.message}`
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
