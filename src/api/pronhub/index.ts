import { Hono } from "hono";
import { getHandler }      from "./pages/get";
import { searchHandler }   from "./pages/search";
import { trendingHandler } from "./pages/trending";

const pornhub = new Hono();

pornhub.get("/get",      getHandler);
pornhub.get("/search",   searchHandler);
pornhub.get("/trending", trendingHandler);

export default pornhub;
