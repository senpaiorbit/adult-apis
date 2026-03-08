import { handlePornhub } from "./api/pornhub/router";
import { maybeError }    from "./utils/modifier";

export interface RouteResult {
  body:   object;
  status: number;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function getCorsHeaders(): Record<string, string> {
  return CORS_HEADERS;
}

export async function route(pathname: string, query: URLSearchParams): Promise<RouteResult> {
  if (pathname === "/" || pathname === "") {
    return {
      status: 200,
      body: {
        name:    "CornHub API",
        version: "1.0.0",
        status:  "ok",
        routes: {
          "GET /pornhub/get?id=<viewkey>":          "Fetch a single video by ID",
          "GET /pornhub/search?q=<query>&page=<n>": "Search videos",
          "GET /pornhub/trending?page=<n>":         "Trending videos",
        },
      },
    };
  }

  if (pathname.startsWith("/pornhub/")) {
    return handlePornhub(pathname, query);
  }

  return { body: maybeError(false, `Route "${pathname}" not found`), status: 404 };
}
