import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/index";

export const config = {
  runtime: "nodejs",
};

// Convert Node IncomingMessage to a Web Request
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const url = `https://${host}${req.url ?? "/"}`;

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

  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await new Promise<ArrayBuffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const merged = Buffer.concat(chunks);
        resolve(merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength) as ArrayBuffer);
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
