import { Hono } from "hono";
import { searchHandler } from "./api/pronhub/pages/search";
import { videoHandler } from "./api/pronhub/pages/video";
import { categoriesHandler } from "./api/pronhub/pages/categories";
import { trendingHandler } from "./api/pronhub/pages/trending";
import { modelHandler } from "./api/pronhub/pages/model";

const app = new Hono().basePath("/");

// ─── Health / root ────────────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    success: true,
    name: "cornhub-api",
    version: "1.0.0",
    uptime: `${Math.floor(process.uptime())}s`,
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heap: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    },
    routes: {
      "GET /pronhub/search?q=&page=":    "Search videos",
      "GET /pronhub/video?id=":           "Video detail + streams",
      "GET /pronhub/trending":            "Trending videos",
      "GET /pronhub/categories":          "All categories",
      "GET /pronhub/model?name=&page=":   "Model profile + videos",
    },
  });
});

// ─── Pronhub routes ───────────────────────────────────────────────────────────

app.get("/pronhub/search",     searchHandler);
app.get("/pronhub/video",      videoHandler);
app.get("/pronhub/trending",   trendingHandler);
app.get("/pronhub/categories", categoriesHandler);
app.get("/pronhub/model",      modelHandler);

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: `Route not found: ${c.req.method} ${c.req.path}`,
    },
    404
  );
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error("[AppError]", err);
  return c.json(
    {
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    500
  );
});

export default app;
