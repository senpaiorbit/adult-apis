import { getHandler }      from "./pages/get";
import { searchHandler }   from "./pages/search";
import { trendingHandler } from "./pages/trending";
import { maybeError }      from "../../utils/modifier";

// Map sub-path → handler
const routes: Record<string, (q: URLSearchParams) => Promise<object>> = {
  "/pornhub/get":      getHandler,
  "/pornhub/search":   searchHandler,
  "/pornhub/trending": trendingHandler,
};

export async function handlePornhub(
  pathname: string,
  query: URLSearchParams
): Promise<{ body: object; status: number }> {
  const handler = routes[pathname];
  if (!handler) {
    return { body: maybeError(false, `Unknown route: ${pathname}`), status: 404 };
  }
  try {
    const body = await handler(query);
    return { body, status: 200 };
  } catch (err) {
    const e = err as Error;
    return { body: maybeError(false, e.message), status: 500 };
  }
}
