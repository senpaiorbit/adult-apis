import { Hono } from "hono";
import { cors } from "hono/cors";
import type { IncomingMessage, ServerResponse } from "http";
import pornhubRouter from "../src/api/pornhub/index";

export const config = {
  maxDuration: 30,
};

const app = new Hono();

app.use("*", cors());

app.get("/", (c) =>
  c.json({
    name: "CornHub API",
    version: "1.0.0",
    status: "ok",
    routes: {
      "GET /pornhub/get?id=<viewkey>": "Fetch a single video by ID",
      "GET /pornhub/search?q=<query>&page=<n>": "Search videos",
      "GET /pornhub/trending?page=<n>": "Trending videos",
    },
  })
);

app.route("/pornhub", pornhubRouter);

app.notFound((c) =>
  c.json({ success: false, message: `Route "${c.req.path}" not found` }, 404)
);

app.onError((err, c) => {
  console.error("[crash]", err);
  return c.json({ success: false, message: err.message }, 500);
});

// @vercel/node passes (req, res) — manually bridge to Hono's fetch handler
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  // Build a full URL from the incoming request
  const host = req.headers["host"] || "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string) || "https";
  const url = `${proto}://${host}${req.url ?? "/"}`;

  // Read body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  // Build a standard Request for Hono
  const webReq = new Request(url, {
    method:  req.method ?? "GET",
    headers: req.headers as Record<string, string>,
    body:    body && body.length > 0 ? body : undefined,
  });

  const webRes = await app.fetch(webReq);

  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const resBody = await webRes.arrayBuffer();
  res.end(Buffer.from(resBody));
}
