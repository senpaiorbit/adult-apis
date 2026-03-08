import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/index";

export const config = {
  runtime: "nodejs",
};

// Convert Node IncomingMessage to a Web Request
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const proto = "https";
  const url = `${proto}://${host}${req.url ?? "/"}`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (!val) continue;
    if (Array.isArray(val)) {
      for (const v of val) headers.append(key, v);
    } else {
      headers.set(key, val);
    }
  }

  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let body: BodyInit | undefined;
  if (hasBody) {
    body = await new Promise<Uint8Array>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      req.on("data", (c: Uint8Array) => chunks.push(c));
      req.on("end", () => {
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const out = new Uint8Array(total);
        let i = 0;
        for (const c of chunks) { out.set(c, i); i += c.length; }
        resolve(out);
      });
      req.on("error", reject);
    });
  }

  return new Request(url, { method, headers, body });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const webReq = await toWebRequest(req);
    const webRes = await app.fetch(webReq);

    res.statusCode = webRes.status;

    webRes.headers.forEach((val, key) => {
      // skip headers Node sets itself
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, val);
    });

    const buf = await webRes.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error("[handler crash]", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Internal Server Error" }));
  }
}
