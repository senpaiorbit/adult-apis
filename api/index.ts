import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/index";

export const config = {
  runtime: "nodejs",
};

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

  let body: string | undefined;
  if (hasBody) {
    body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => { data += chunk; });
      req.on("end", () => resolve(data));
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
