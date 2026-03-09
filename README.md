# AdultColony API – Vercel Serverless Edition

A Vercel-native rewrite of the [AdultColony API](https://github.com/Snowball-01/AdultColony-API).  
Currently supports **Pornhub** only — more sites coming soon.

---

## Runtime strategy

| File | Runtime | Why |
|---|---|---|
| `api/pornhub/get.ts` | **Node.js** | Needs `cheerio`, `http`, `https` for heavy HTML scraping |
| `api/pornhub/search.ts` | **Node.js** | Same — page-level DOM parsing |
| `api/pornhub/random.ts` | **Node.js** | Same — follows 302 redirect then scrapes |
| `api/stats.ts` | **Node.js** | Uses `process.memoryUsage()` (Node API) |
| `api/index.ts` | **Edge** | Pure JSON response — zero cold-start |

---

## Project structure

```
.
├── api/
│   ├── index.ts              ← Edge  – API directory
│   ├── stats.ts              ← Node  – runtime stats
│   └── pornhub/
│       ├── get.ts            ← Node  – video metadata
│       ├── search.ts         ← Node  – search results
│       └── random.ts         ← Node  – random video
├── lib/
│   ├── fetcher.ts            ← HTTP fetcher with retry logic
│   ├── interfaces.ts         ← Shared TypeScript types
│   ├── modifier.ts           ← String helpers
│   ├── options.ts            ← Base URLs per site
│   └── scrapers/
│       └── pornhub/
│           ├── getController.ts      ← cheerio scraper – single video
│           └── searchController.ts  ← cheerio scraper – search results
├── public/
│   └── index.html            ← Dashboard with live try-it-out
├── vercel.json
├── package.json
└── tsconfig.json
```

---

## Endpoints

All endpoints also reachable without the `/api` prefix (via `vercel.json` rewrites).

### PornHub

| Method | Path | Params |
|--------|------|--------|
| GET | `/pornhub/get` | `id` (required) – viewkey |
| GET | `/pornhub/search` | `query` (required), `page` (default 1) |
| GET | `/pornhub/random` | — |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Runtime stats |
| GET | `/` | API directory (Edge) |

---

## Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Clone and install deps
git clone <your-repo>
cd adultcolony-vercel
npm install

# Deploy
vercel
```

### Environment variables (optional)

| Variable | Default | Description |
|---|---|---|
| `USER_AGENT` | Chrome 124 UA string | Override the HTTP User-Agent sent to target sites |

---

## Adding more sites

1. Add base URL to `lib/options.ts`
2. Create `lib/scrapers/<site>/getController.ts` and `searchController.ts`
3. Create `api/<site>/get.ts`, `search.ts` (and `random.ts` if applicable)
4. Add rewrites to `vercel.json`
