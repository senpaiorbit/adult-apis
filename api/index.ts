import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/index";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  const bodyBuffer =
    req.method !== "GET" && req.method !== "HEAD"
      ? await streamToBuffer(req)
      : null;

  // Build a fetch-compatible Request from the Vercel IncomingMessage
  const fetchReq = new Request(url.toString(), {
    method: req.method ?? "GET",
    headers: req.headers as Record<string, string>,
    body: bodyBuffer ? (bodyBuffer as unknown as BodyInit) : undefined,
  });

  const fetchRes = await app.fetch(fetchReq);

  res.status(fetchRes.status);

  fetchRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await fetchRes.text();
  res.end(body);
}

function streamToBuffer(req: VercelRequest): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    req.on("end", () => {
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(merged);
    });
    req.on("error", reject);
  });
}
