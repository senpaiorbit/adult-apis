import { Hono, type Context } from "hono";
import { cors }   from "hono/cors";
import { logger } from "hono/logger";
import pornhubRouter from "./api/pornhub";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/", (c: Context) =>
  c.json({
    name:    "CornHub API",
    version: "1.0.0",
    routes: {
      "GET /pornhub/get?id=<viewkey>":          "Fetch a single video by ID",
      "GET /pornhub/search?q=<query>&page=<n>": "Search videos",
      "GET /pornhub/trending?page=<n>":         "Trending videos",
    },
  })
);

// Site routers
app.route("/pornhub", pornhubRouter);

// 404 fallback
app.notFound((c: Context) =>
  c.json({ success: false, message: `Route ${c.req.path} not found` }, 404)
);

// Global error handler
app.onError((err: Error, c: Context) => {
  console.error("[onError]", err.message);
  return c.json({ success: false, message: err.message }, 500);
});

export default app;
