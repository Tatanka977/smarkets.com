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

// One Marketaux "entity" — a ticker the article mentions, with Marketaux's
// own per-symbol sentiment score for that mention (roughly -1..1).
export interface NewsEntity {
  symbol: string;
  sentimentScore: number | null;
}

export interface PortfolioNewsItem extends NewsItem {
  entities?: NewsEntity[];
  // Average sentimentScore across the entities that matched a symbol from
  // the requesting portfolio (null if Marketaux gave no score for any of
  // them) — what the UI's colored indicator renders directly.
  sentimentScore?: number | null;
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

// ── Marketaux — portfolio-holdings news ────────────────────────────────────
// Second, complementary news source used ONLY for the terminal's "MY
// HOLDINGS" tab (Market/Symbol tabs stay on Finnhub above). Marketaux's
// /news/all endpoint accepts a comma-separated symbols list and its
// per-article `entities` carry a sentiment_score per mentioned ticker,
// which Finnhub's plain headlines don't provide.

const MARKETAUX_BASE = "https://api.marketaux.com/v1/news/all";

function getMarketauxKey(): string | null {
  const k = process.env.MARKETAUX_API_KEY;
  return k && k.trim() ? k : null;
}

interface MarketauxEntity {
  symbol?: string;
  sentiment_score?: number | null;
}
interface MarketauxArticle {
  uuid?: string;
  title?: string;
  description?: string;
  url?: string;
  source?: string;
  published_at?: string;
  entities?: MarketauxEntity[];
}
interface MarketauxResponse {
  data?: MarketauxArticle[];
}

// Free-tier Marketaux plans allow only ~100 requests/day, so every portfolio
// (by its exact set of tickers) is cached process-wide for a few minutes —
// reloading the News tab repeatedly, or several visitors with the same
// holdings, reuses one call instead of spending quota per page view.
const PORTFOLIO_NEWS_TTL_MS = 5 * 60 * 1000;
const portfolioNewsCache = new Map<string, { data: PortfolioNewsItem[]; expiresAt: number }>();

function cacheKeyFor(tickers: string[]): string {
  return Array.from(new Set(tickers.map(t => t.trim().toUpperCase()).filter(Boolean))).sort().join(",");
}

// Average sentiment across just the entities that actually match one of the
// requested portfolio tickers (Marketaux's filter_entities=true already
// scopes entities to matched symbols, but this stays defensive in case an
// article's entity list is broader than expected).
function aggregateSentiment(entities: NewsEntity[], portfolioSet: Set<string>): number | null {
  const scored = entities.filter(e => portfolioSet.has(e.symbol.toUpperCase()) && e.sentimentScore != null);
  if (!scored.length) return null;
  return scored.reduce((s, e) => s + (e.sentimentScore as number), 0) / scored.length;
}

// Returns null when Marketaux isn't configured or the request failed — the
// caller's job is to fall back to the existing Finnhub per-symbol news in
// that case. An empty array is a real, successful "no news for these
// tickers right now" answer and should be shown as such, not treated as a
// failure that needs falling back.
export const fetchPortfolioNews = createServerFn({ method: "GET" })
  .inputValidator((d: { tickers: string[] }) => d)
  .handler(async ({ data }): Promise<PortfolioNewsItem[] | null> => {
    const tickers = Array.from(new Set((data.tickers || []).map(t => (t || "").trim().toUpperCase()).filter(Boolean)));
    if (!tickers.length) return [];

    const key = getMarketauxKey();
    if (!key) return null;

    const cacheKey = cacheKeyFor(tickers);
    const cached = portfolioNewsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const url = `${MARKETAUX_BASE}?symbols=${encodeURIComponent(tickers.join(","))}&filter_entities=true&language=en&api_token=${key}`;
    let json: MarketauxResponse | null = null;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        console.warn("[Marketaux news]", r.status);
        return null;
      }
      json = (await r.json()) as MarketauxResponse;
    } catch (e) {
      console.warn("[Marketaux news] error", (e as Error).message);
      return null;
    }

    const portfolioSet = new Set(tickers);
    const articles = Array.isArray(json?.data) ? json!.data! : [];
    const items: PortfolioNewsItem[] = articles.map((a, i) => {
      const entities: NewsEntity[] = (a.entities || [])
        .filter(e => !!e.symbol)
        .map(e => ({ symbol: (e.symbol as string).toUpperCase(), sentimentScore: e.sentiment_score ?? null }));
      const publishedAt = a.published_at ? Math.floor(new Date(a.published_at).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const matchedSymbols = entities.map(e => e.symbol).filter(s => portfolioSet.has(s));
      return {
        id: a.uuid || `mtx-${i}`,
        datetime: publishedAt,
        headline: a.title || "(untitled)",
        summary: a.description || "",
        source: a.source || "Marketaux",
        url: a.url || "#",
        related: matchedSymbols.join(","),
        entities,
        sentimentScore: aggregateSentiment(entities, portfolioSet),
      };
    });

    portfolioNewsCache.set(cacheKey, { data: items, expiresAt: Date.now() + PORTFOLIO_NEWS_TTL_MS });
    return items;
  });
