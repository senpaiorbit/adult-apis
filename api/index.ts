import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/index";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // Build a fetch-compatible Request from the Vercel IncomingMessage
  const fetchReq = new Request(url.toString(), {
    method: req.method ?? "GET",
    headers: req.headers as Record<string, string>,
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? await streamToBuffer(req)
        : undefined,
  });

  const fetchRes = await app.fetch(fetchReq);

  res.status(fetchRes.status);

  fetchRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await fetchRes.text();
  res.end(body);
}

function streamToBuffer(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
