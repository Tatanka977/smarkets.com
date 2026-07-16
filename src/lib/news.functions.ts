import { createServerFn } from "@tanstack/react-start";

export interface NewsItem {
  id: number | string;
  category?: string;
  datetime: number; // unix seconds
  headline: string;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url: string;
}

const BASE = "https://finnhub.io/api/v1";

function getKey(): string | null {
  const k = process.env.FINNHUB_API_KEY;
  return k && k.trim() ? k : null;
}

async function fh<T>(path: string): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}token=${key}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn("[Finnhub news]", r.status, path);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.warn("[Finnhub news] error", (e as Error).message);
    return null;
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const FALLBACK_MARKET_NEWS: NewsItem[] = [
  {
    id: "mk-1",
    category: "general",
    datetime: Math.floor(Date.now() / 1000) - 3600,
    headline: "Markets pause as investors await CPI data",
    source: "Mock Wire",
    summary: "Major indices trade flat ahead of the latest inflation reading expected later this week. Bond yields little changed; gold steady near record highs.",
    url: "#",
  },
  {
    id: "mk-2",
    category: "crypto",
    datetime: Math.floor(Date.now() / 1000) - 7200,
    headline: "Bitcoin holds near $98K as ETF inflows continue",
    source: "Mock Wire",
    summary: "Spot bitcoin ETFs absorbed $420M of net inflows yesterday, the third consecutive positive session.",
    url: "#",
  },
  {
    id: "mk-3",
    category: "forex",
    datetime: Math.floor(Date.now() / 1000) - 10800,
    headline: "EUR/USD softens after dovish ECB minutes",
    source: "Mock Wire",
    summary: "Single currency dips below 1.085 as policymakers signal patience on the path to additional easing.",
    url: "#",
  },
];

export const fetchMarketNews = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const cat = data.category || "general";
    const res = await fh<NewsItem[]>(`/news?category=${encodeURIComponent(cat)}`);
    if (res && res.length) return res.slice(0, 30);
    return FALLBACK_MARKET_NEWS;
  });

export const fetchCompanyNews = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string; days?: number }) => d)
  .handler(async ({ data }) => {
    const sym = (data.symbol || "").trim().toUpperCase();
    if (!sym) return [];
    const days = Math.max(1, Math.min(30, data.days || 14));
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    const res = await fh<NewsItem[]>(
      `/company-news?symbol=${encodeURIComponent(sym)}&from=${ymd(from)}&to=${ymd(to)}`,
    );
    if (res && res.length) return res.slice(0, 25);
    return [
      {
        id: "fb-1",
        datetime: Math.floor(Date.now() / 1000) - 1800,
        headline: `${sym} — no live news available right now`,
        source: "Strategic Markets",
        summary: "Finnhub did not return company-specific news in the last few days. Try a major US ticker (AAPL, MSFT, NVDA) for live coverage.",
        url: "#",
      },
    ] as NewsItem[];
  });
