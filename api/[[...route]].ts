import { Hono } from "hono";
import { handle } from "hono/vercel";
import type { IncomingMessage, ServerResponse } from "http";
import { cors } from "hono/cors";
import pornhubRouter from "../src/api/pornhub";

// Must be "edge" or omitted for @vercel/node — do NOT set runtime: "nodejs"
export const config = {
  maxDuration: 30,
};

const app = new Hono().basePath("/");

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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  return handle(app)(req as any, res as any);
}
