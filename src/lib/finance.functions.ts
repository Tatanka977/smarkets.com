import { createServerFn } from "@tanstack/react-start";

export type Category = "STOCK" | "ETF" | "BOND" | "COMMODITY" | "CRYPTO" | "REIT" | "FX" | "CASH";

export const CATEGORIES: Category[] = ["STOCK","ETF","BOND","COMMODITY","CRYPTO","REIT","FX","CASH"];

export interface SearchResult {
  symbol: string;
  shortName: string;
  exchange: string;
  type: string;
  category?: Category;
  sector?: string;
  industry?: string;
  geo?: string;
  // Present only when this result came from an ISIN search — lets fetchQuote
  // retry via Yahoo's own ISIN resolution if `symbol` itself has no price.
  isin?: string;
}

export interface Quote {
  symbol: string;
  shortName: string;
  price: number | null;
  previousClose: number | null;
  dayChangePct: number | null;
  currency: string | null;
  exchange: string | null;
  marketCap: number | null;
  pe: number | null;
  dividendYield: number | null;
  sector?: string;
  industry?: string;
  geo?: string;
  type?: string;
  category?: Category;
  ytd?: number | null;
  vol?: number;
  beta?: number;
  er?: number;
  dy?: number;
  ticker?: string;
  // ETF/fund look-through sector breakdown (fraction of the fund's total
  // value per sector, e.g. { Technology: 0.385, Healthcare: 0.089, ... }) —
  // from Yahoo's topHoldings module, see fetchYahooProfile below. Absent
  // for individual stocks/REITs (they use `sector` directly instead) and
  // for funds Yahoo has no holdings breakdown for.
  sectorWeights?: Record<string, number>;
}

const BASE = "https://finnhub.io/api/v1";

function getKey(): string {
  const k = process.env.FINNHUB_API_KEY;
  if (!k) throw new Error("FINNHUB_API_KEY not configured");
  return k;
}

async function fh<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}token=${getKey()}`;
  const r = await fetch(url);
  const text = await r.text();
  if (!r.ok) {
    console.error("[Finnhub]", r.status, path, text.slice(0, 200));
    throw new Error(`Finnhub ${r.status}: ${text.slice(0, 120)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[Finnhub] bad JSON", path, text.slice(0, 200));
    throw new Error("Finnhub bad JSON");
  }
}

interface FhQuote {
  c: number; // current
  d: number; // change
  dp: number; // change percent
  h: number;
  l: number;
  o: number;
  pc: number; // previous close
  t: number;
}

interface FhProfile {
  country?: string;
  currency?: string;
  exchange?: string;
  name?: string;
  ticker?: string;
  marketCapitalization?: number; // in millions
  finnhubIndustry?: string;
  ipo?: string;
  weburl?: string;
}

interface FhMetrics {
  metric?: {
    peBasicExclExtraTTM?: number;
    peNormalizedAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    yearToDatePriceReturnDaily?: number;
    "3MonthAverageTradingVolume"?: number;
  };
}

interface FhSearch {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

function geoFromCountry(c?: string): string {
  if (!c) return "WORLD";
  if (c === "US") return "USA";
  if (c === "GB") return "UK";
  if (["DE", "FR", "IT", "ES", "NL", "CH"].includes(c)) return "EUROPE";
  if (["JP", "CN", "HK", "KR", "SG", "IN"].includes(c)) return "ASIA";
  return c;
}

// Fallback geo classification for the Yahoo-only quote path (see
// fetchYahooQuoteFull below), which has no country field at all — its
// exchange's IANA timezone is real exchange metadata (not a guess) and a
// reliable enough proxy for where that exchange sits.
function geoFromExchangeTimezone(tz?: string): string {
  if (!tz) return "WORLD";
  if (tz.startsWith("America/")) {
    return ["America/Toronto", "America/Vancouver", "America/Montreal"].includes(tz) ? "CANADA" : "USA";
  }
  if (tz === "Europe/London") return "UK";
  if (tz.startsWith("Europe/")) return "EUROPE";
  if (["Asia/Tokyo", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Seoul", "Asia/Singapore", "Asia/Kolkata", "Asia/Calcutta"].includes(tz)) return "ASIA";
  if (tz.startsWith("Australia/")) return "AUSTRALIA";
  return "WORLD";
}

async function buildQuote(symbol: string): Promise<Quote> {
  const sym = symbol.trim().toUpperCase();

  const [q, profile, metrics] = await Promise.all([
    fh<FhQuote>(`/quote?symbol=${encodeURIComponent(sym)}`).catch(
      () => null as FhQuote | null
    ),
    fh<FhProfile>(`/stock/profile2?symbol=${encodeURIComponent(sym)}`).catch(
      () => ({} as FhProfile)
    ),
    fh<FhMetrics>(
      `/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all`
    ).catch(() => ({} as FhMetrics)),
  ]);

  const price = q?.c ?? null;
  const prev = q?.pc ?? null;
  const dayChangePct = q?.dp ?? null;

  const m = metrics?.metric || {};
  const ytd = m.yearToDatePriceReturnDaily ?? null;
  const high = m["52WeekHigh"];
  const low = m["52WeekLow"];
  let vol = 0;
  if (high && low && price) {
    // rough proxy if no historical: range / mid * sqrt(252/52)
    vol = ((high - low) / ((high + low) / 2)) * 100 * 0.5;
  }

  return {
    symbol: sym,
    ticker: sym,
    shortName: profile?.name || sym,
    price,
    previousClose: prev,
    dayChangePct,
    currency: profile?.currency || "USD",
    exchange: profile?.exchange || "—",
    marketCap: profile?.marketCapitalization
      ? profile.marketCapitalization * 1_000_000
      : null,
    pe: m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null,
    dividendYield: m.dividendYieldIndicatedAnnual ?? null,
    geo: geoFromCountry(profile?.country),
    industry: profile?.finnhubIndustry,
    sector: profile?.finnhubIndustry,
    type: "Equity",
    ytd,
    vol: +vol.toFixed(2),
    beta: m.beta ?? 1,
    er: ytd ?? 0,
    dy: m.dividendYieldIndicatedAnnual ?? 0,
  };
}

// =============================================================
// MOCK UNIVERSE + FALLBACK QUOTES.
// Finnhub (buildQuote/fh above) is used whenever FINNHUB_API_KEY is
// configured — see hasFinnhub() below. MOCK_UNIVERSE/findMock() only
// kick in for categories Finnhub's free tier doesn't cover (crypto/FX/
// bonds/commodities) or when a live lookup fails, as a last-resort
// fallback so the UI always has a price to show.
// =============================================================

const MOCK_UNIVERSE: Quote[] = [
  // STOCKS
  { symbol: "AAPL", ticker: "AAPL", shortName: "Apple Inc.", price: 195.42, previousClose: 193.10, dayChangePct: 1.20, currency: "USD", exchange: "NASDAQ", marketCap: 3_010_000_000_000, pe: 32.1, dividendYield: 0.48, geo: "USA", industry: "Technology", type: "Equity", category: "STOCK", ytd: 12.4, vol: 22.1, beta: 1.25, er: 12.4, dy: 0.48 },
  { symbol: "MSFT", ticker: "MSFT", shortName: "Microsoft Corp.", price: 421.55, previousClose: 418.20, dayChangePct: 0.80, currency: "USD", exchange: "NASDAQ", marketCap: 3_130_000_000_000, pe: 35.6, dividendYield: 0.72, geo: "USA", industry: "Software", type: "Equity", category: "STOCK", ytd: 18.2, vol: 19.8, beta: 0.95, er: 18.2, dy: 0.72 },
  { symbol: "NVDA", ticker: "NVDA", shortName: "NVIDIA Corp.", price: 138.20, previousClose: 134.50, dayChangePct: 2.75, currency: "USD", exchange: "NASDAQ", marketCap: 3_400_000_000_000, pe: 65.4, dividendYield: 0.03, geo: "USA", industry: "Semiconductors", type: "Equity", category: "STOCK", ytd: 145.0, vol: 48.3, beta: 1.75, er: 145.0, dy: 0.03 },
  { symbol: "TSLA", ticker: "TSLA", shortName: "Tesla Inc.", price: 248.50, previousClose: 255.10, dayChangePct: -2.59, currency: "USD", exchange: "NASDAQ", marketCap: 790_000_000_000, pe: 72.3, dividendYield: 0, geo: "USA", industry: "Automotive", type: "Equity", category: "STOCK", ytd: -8.4, vol: 55.2, beta: 2.10, er: -8.4, dy: 0 },
  { symbol: "JPM", ticker: "JPM", shortName: "JPMorgan Chase & Co.", price: 218.75, previousClose: 217.40, dayChangePct: 0.62, currency: "USD", exchange: "NYSE", marketCap: 625_000_000_000, pe: 12.4, dividendYield: 2.28, geo: "USA", industry: "Banking", type: "Equity", category: "STOCK", ytd: 24.8, vol: 18.5, beta: 1.10, er: 24.8, dy: 2.28 },
  // ETFs
  { symbol: "SPY", ticker: "SPY", shortName: "SPDR S&P 500 ETF", price: 598.40, previousClose: 596.20, dayChangePct: 0.37, currency: "USD", exchange: "NYSE", marketCap: 600_000_000_000, pe: 24.8, dividendYield: 1.32, geo: "USA", industry: "Broad Market", type: "ETF", category: "ETF", ytd: 26.5, vol: 13.4, beta: 1.00, er: 26.5, dy: 1.32 },
  { symbol: "QQQ", ticker: "QQQ", shortName: "Invesco QQQ Trust", price: 519.80, previousClose: 516.00, dayChangePct: 0.74, currency: "USD", exchange: "NASDAQ", marketCap: 320_000_000_000, pe: 30.5, dividendYield: 0.56, geo: "USA", industry: "Tech ETF", type: "ETF", category: "ETF", ytd: 31.2, vol: 18.1, beta: 1.15, er: 31.2, dy: 0.56 },
  { symbol: "VWCE", ticker: "VWCE", shortName: "Vanguard FTSE All-World", price: 128.40, previousClose: 127.80, dayChangePct: 0.47, currency: "EUR", exchange: "XETRA", marketCap: 15_000_000_000, pe: 19.2, dividendYield: 1.65, geo: "WORLD", industry: "Global ETF", type: "ETF", category: "ETF", ytd: 22.1, vol: 14.2, beta: 0.98, er: 22.1, dy: 1.65 },
  // BONDS
  { symbol: "TLT", ticker: "TLT", shortName: "iShares 20+ Year Treasury", price: 92.15, previousClose: 91.80, dayChangePct: 0.38, currency: "USD", exchange: "NASDAQ", marketCap: 48_000_000_000, pe: null, dividendYield: 4.12, geo: "USA", industry: "Government Bond", type: "Bond ETF", category: "BOND", ytd: -2.4, vol: 11.5, beta: -0.15, er: -2.4, dy: 4.12 },
  { symbol: "AGG", ticker: "AGG", shortName: "iShares Core US Aggregate Bond", price: 98.70, previousClose: 98.50, dayChangePct: 0.20, currency: "USD", exchange: "NYSE", marketCap: 115_000_000_000, pe: null, dividendYield: 3.85, geo: "USA", industry: "Aggregate Bond", type: "Bond ETF", category: "BOND", ytd: 1.8, vol: 5.2, beta: 0.05, er: 1.8, dy: 3.85 },
  { symbol: "BTP30", ticker: "BTP30", shortName: "Italy BTP 4.5% 2053", price: 96.80, previousClose: 96.55, dayChangePct: 0.26, currency: "EUR", exchange: "MOT", marketCap: 25_000_000_000, pe: null, dividendYield: 4.65, geo: "EUROPE", industry: "Sovereign Bond", type: "Bond", category: "BOND", ytd: 3.2, vol: 9.8, beta: 0.10, er: 3.2, dy: 4.65 },
  // COMMODITIES
  { symbol: "GLD", ticker: "GLD", shortName: "SPDR Gold Trust", price: 252.30, previousClose: 250.80, dayChangePct: 0.60, currency: "USD", exchange: "NYSE", marketCap: 78_000_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Gold", type: "Commodity ETF", category: "COMMODITY", ytd: 28.5, vol: 15.8, beta: 0.10, er: 28.5, dy: 0 },
  { symbol: "SLV", ticker: "SLV", shortName: "iShares Silver Trust", price: 30.45, previousClose: 30.10, dayChangePct: 1.16, currency: "USD", exchange: "NYSE", marketCap: 14_000_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Silver", type: "Commodity ETF", category: "COMMODITY", ytd: 35.2, vol: 24.5, beta: 0.45, er: 35.2, dy: 0 },
  { symbol: "USO", ticker: "USO", shortName: "US Oil Fund", price: 74.20, previousClose: 75.10, dayChangePct: -1.20, currency: "USD", exchange: "NYSE", marketCap: 1_500_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Crude Oil", type: "Commodity ETF", category: "COMMODITY", ytd: 6.4, vol: 32.1, beta: 0.85, er: 6.4, dy: 0 },
  // CRYPTO
  { symbol: "BTC-USD", ticker: "BTC", shortName: "Bitcoin", price: 98450.00, previousClose: 96200.00, dayChangePct: 2.34, currency: "USD", exchange: "CRYPTO", marketCap: 1_950_000_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Cryptocurrency", type: "Crypto", category: "CRYPTO", ytd: 132.5, vol: 62.4, beta: 2.50, er: 132.5, dy: 0 },
  { symbol: "ETH-USD", ticker: "ETH", shortName: "Ethereum", price: 3820.00, previousClose: 3750.00, dayChangePct: 1.87, currency: "USD", exchange: "CRYPTO", marketCap: 460_000_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Cryptocurrency", type: "Crypto", category: "CRYPTO", ytd: 68.2, vol: 71.5, beta: 2.80, er: 68.2, dy: 0 },
  { symbol: "SOL-USD", ticker: "SOL", shortName: "Solana", price: 215.40, previousClose: 208.00, dayChangePct: 3.56, currency: "USD", exchange: "CRYPTO", marketCap: 102_000_000_000, pe: null, dividendYield: 0, geo: "WORLD", industry: "Cryptocurrency", type: "Crypto", category: "CRYPTO", ytd: 112.0, vol: 88.2, beta: 3.20, er: 112.0, dy: 0 },
  // REIT
  { symbol: "VNQ", ticker: "VNQ", shortName: "Vanguard Real Estate ETF", price: 92.80, previousClose: 92.20, dayChangePct: 0.65, currency: "USD", exchange: "NYSE", marketCap: 35_000_000_000, pe: 32.5, dividendYield: 3.95, geo: "USA", industry: "Real Estate", type: "REIT ETF", category: "REIT", ytd: 8.5, vol: 17.2, beta: 0.95, er: 8.5, dy: 3.95 },
  { symbol: "O", ticker: "O", shortName: "Realty Income Corp.", price: 58.40, previousClose: 58.10, dayChangePct: 0.52, currency: "USD", exchange: "NYSE", marketCap: 52_000_000_000, pe: 55.8, dividendYield: 5.42, geo: "USA", industry: "Retail REIT", type: "REIT", category: "REIT", ytd: 4.2, vol: 18.5, beta: 0.85, er: 4.2, dy: 5.42 },
  // FX
  { symbol: "EURUSD", ticker: "EURUSD", shortName: "Euro / US Dollar", price: 1.0845, previousClose: 1.0820, dayChangePct: 0.23, currency: "USD", exchange: "FX", marketCap: null, pe: null, dividendYield: 0, geo: "WORLD", industry: "Forex", type: "FX", category: "FX", ytd: -1.8, vol: 7.5, beta: 0, er: -1.8, dy: 0 },
  { symbol: "GBPUSD", ticker: "GBPUSD", shortName: "British Pound / US Dollar", price: 1.2710, previousClose: 1.2680, dayChangePct: 0.24, currency: "USD", exchange: "FX", marketCap: null, pe: null, dividendYield: 0, geo: "WORLD", industry: "Forex", type: "FX", category: "FX", ytd: -0.5, vol: 8.2, beta: 0, er: -0.5, dy: 0 },
];

function findMock(sym: string): Quote {
  const s = sym.trim().toUpperCase();
  const found = MOCK_UNIVERSE.find((q) => q.symbol === s || q.ticker === s);
  if (found) return { ...found };
  const price = 50 + (s.charCodeAt(0) % 30) * 7.3;
  const prev = price * 0.995;
  return {
    symbol: s, ticker: s, shortName: `${s} Holdings`,
    price: +price.toFixed(2), previousClose: +prev.toFixed(2),
    dayChangePct: +(((price - prev) / prev) * 100).toFixed(2),
    currency: "USD", exchange: "NASDAQ",
    marketCap: 10_000_000_000, pe: 20, dividendYield: 1.5,
    geo: "USA", industry: "Diversified", type: "Equity", category: "STOCK",
    ytd: 8.5, vol: 20, beta: 1, er: 8.5, dy: 1.5,
  };
}

function hasFinnhub(): boolean {
  return !!process.env.FINNHUB_API_KEY;
}

// Map mock universe categories to be useful for filtering Finnhub search results
function inferCategoryFromType(t: string): Category | undefined {
  const u = (t || "").toUpperCase();
  if (u.includes("ETF")) return "ETF";
  if (u.includes("BOND")) return "BOND";
  if (u.includes("REIT")) return "REIT";
  if (u.includes("COMMODITY")) return "COMMODITY";
  if (u.includes("CRYPTO")) return "CRYPTO";
  if (u.includes("FX") || u.includes("FOREX")) return "FX";
  if (u.includes("COMMON") || u.includes("EQUITY") || u.includes("STOCK")) return "STOCK";
  return "STOCK";
}
interface YahooSearchQuote {
  symbol: string; shortname?: string; longname?: string;
  exchDisp?: string; typeDisp?: string; quoteType?: string;
}
interface YahooSearchResponse { quotes?: YahooSearchQuote[] }

async function searchYahoo(query: string): Promise<SearchResult[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=25&newsCount=0`;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)" } });
    if (!r.ok) return [];
    const j = (await r.json()) as YahooSearchResponse;
    return (j.quotes || []).filter(q => q.symbol).map(q => ({
      symbol: q.symbol,
      shortName: q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || "—",
      type: q.typeDisp || q.quoteType || "Equity",
      category: inferCategoryFromType(q.quoteType || q.typeDisp || ""),
    }));
  } catch (e) {
    console.warn("[Yahoo search]", (e as Error).message);
    return [];
  }
}

// Crumb-free category backfill for quotes that came back from Finnhub
// (buildQuote never sets category at all — Finnhub's profile2 endpoint has
// no stock/ETF/REIT distinction) and weren't a MOCK_UNIVERSE match either.
// Yahoo's search endpoint (unlike quoteSummary) needs no crumb/cookie and
// already resolves quoteType exactly for this.
async function classifyCategory(sym: string): Promise<Category | undefined> {
  try {
    const results = await searchYahoo(sym);
    const hit = results.find(r => r.symbol.toUpperCase() === sym) || results[0];
    return hit?.category;
  } catch {
    return undefined;
  }
}

interface OpenFigiResult {
  data?: Array<{ ticker?: string; name?: string; exchCode?: string; securityType?: string; marketSector?: string }>;
}

function isIsin(q: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(q.trim().toUpperCase());
}

async function searchByIsin(isin: string): Promise<SearchResult[]> {
  try {
    const r = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin.toUpperCase() }]),
    });
    if (!r.ok) return [];
    const json = (await r.json()) as OpenFigiResult[];
    const entries = json[0]?.data || [];
    return entries.filter(e => e.ticker).map(e => ({
      symbol: e.ticker!,
      shortName: e.name || e.ticker!,
      exchange: e.exchCode || "—",
      type: e.securityType || "Equity",
      category: inferCategoryFromType(e.securityType || e.marketSector || ""),
      isin: isin.toUpperCase(),
    }));
  } catch (e) {
    console.warn("[OpenFIGI]", (e as Error).message);
    return [];
  }
}
export const searchSecurities = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; category?: Category }) => d)
  .handler(async ({ data }) => {
    const q = (data.q || "").trim();
    if (!q) return [];

    let results: SearchResult[];
    if (isIsin(q)) {
      // OpenFIGI's mapped ticker is sometimes a local/internal exchange code
      // (common for mutual funds, e.g. an Italian fund mapped to its Borsa
      // Italiana code) that Yahoo/Finnhub quote lookups don't recognize at
      // all, even though the same instrument IS quotable on Yahoo under its
      // own symbol for a different listing. Short-circuiting on "OpenFIGI
      // returned something" meant that dead-end ticker was the only option
      // offered, with no price ever resolving. Always fetch both and merge
      // (deduped by symbol) so a working Yahoo-native symbol is still on
      // offer even when OpenFIGI "succeeds" with an unusable one.
      const [figiResults, yahooResults] = await Promise.all([searchByIsin(q), searchYahoo(q)]);
      // Tag the Yahoo-sourced results with the ISIN too, so fetchQuote's
      // retry-via-ISIN fallback below applies no matter which of the two
      // (deduped) results the user actually picks.
      const seen = new Set<string>();
      results = [...figiResults, ...yahooResults.map(r => ({ ...r, isin: q.toUpperCase() }))].filter(r => {
        if (seen.has(r.symbol)) return false;
        seen.add(r.symbol);
        return true;
      });
    } else {
      results = await searchYahoo(q);
    }

    if (data.category) {
      results = results.filter(r => r.category === data.category);
    }
    return results;
  });
export const fetchQuote = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string; isin?: string }) => d)
  .handler(async ({ data }) => {
    const sym = (data.symbol || "").trim().toUpperCase();
    // Crypto/FX/commodities stay on mock (Finnhub free tier lacks live
    // coverage for those). Bonds used to be short-circuited here too, which
    // meant real, liquid tickers like TLT/AGG — and any BTP/govt bond
    // looked up by its real ISIN — always showed the same frozen
    // MOCK_UNIVERSE price instead of a live one; they now go through the
    // normal Finnhub/Yahoo/ISIN-retry chain below like any stock or ETF.
    const mock = MOCK_UNIVERSE.find((q) => q.symbol === sym || q.ticker === sym);
    if (mock && mock.category && ["CRYPTO", "FX", "COMMODITY"].includes(mock.category)) {
      return findMock(sym);
    }
    if (hasFinnhub()) {
      try {
        const q = await buildQuote(sym);
        // Finnhub returns HTTP 200 with every field zeroed out (not an
        // error) for a symbol it doesn't recognize — `price != null` alone
        // treats that fake zero-quote as valid and returns it immediately,
        // which for e.g. an OpenFIGI-mapped local ticker Finnhub has never
        // heard of skipped the Yahoo/ISIN fallback below entirely.
        if (q.price != null && q.price > 0) {
          if (mock) {
            q.category = mock.category;
            q.sector = q.sector || mock.industry;
            q.industry = q.industry || mock.industry;
            q.type = q.type || mock.type;
            q.geo = q.geo || mock.geo;
          }
          await applyYahooProfile(q, sym);
          // buildQuote (Finnhub) never sets category at all — Finnhub's
          // profile2 endpoint has no stock/ETF/REIT distinction — so
          // anything not already classified via mock/applyYahooProfile's
          // ETF-detection is backfilled with a crumb-free Yahoo search
          // lookup instead of silently staying uncategorized.
          if (!q.category) q.category = await classifyCategory(sym);
          return q;
        }
      } catch (e) {
        console.warn("[Finnhub quote] falling back:", (e as Error).message);
      }
    }
    // Finnhub unavailable/failed/doesn't cover this exchange — try a real Yahoo
    // quote before resorting to findMock()'s fictional ticker-derived price.
    const yq = await fetchYahooQuoteFull(sym);
    if (yq) {
      if (mock) {
        yq.category = mock.category;
        yq.sector = yq.sector || mock.industry;
        yq.industry = yq.industry || mock.industry;
        yq.type = yq.type || mock.type;
        yq.geo = yq.geo || mock.geo;
      }
      await applyYahooProfile(yq, sym);
      return yq;
    }

    // Last resort before giving up to a fictional mock price: `sym` itself
    // (often an OpenFIGI-mapped local exchange ticker for mutual funds,
    // e.g. an Italian fund's Borsa Italiana code) may have no resolvable
    // price anywhere, while the same instrument IS quotable on Yahoo under
    // a different symbol for its ISIN. Re-resolve via Yahoo search and try
    // each candidate until one actually has a price.
    if (data.isin) {
      const candidates = await searchYahoo(data.isin);
      for (const c of candidates) {
        if (c.symbol.toUpperCase() === sym) continue; // already tried above
        const alt = await fetchYahooQuoteFull(c.symbol);
        if (alt) {
          if (mock) {
            alt.category = mock.category;
            alt.sector = alt.sector || mock.industry;
            alt.industry = alt.industry || mock.industry;
            alt.type = alt.type || mock.type;
            alt.geo = alt.geo || mock.geo;
          }
          await applyYahooProfile(alt, c.symbol);
          return alt;
        }
      }
    }

    const m = findMock(sym);
    await applyYahooProfile(m, sym);
    return m;
  });

// Bounds the work a single request can trigger — without this, an
// unauthenticated caller could pass an arbitrarily large `symbols` array
// and tie up the server (and burn Finnhub's paid-tier quota) indefinitely.
const MAX_BATCH_SYMBOLS = 100;

export const batchRefresh = createServerFn({ method: "POST" })
  .inputValidator((d: { symbols: string[] }) => d)
  .handler(async ({ data }) => {
    const symbols = (data.symbols || []).slice(0, MAX_BATCH_SYMBOLS);
    // Parallelized (was a sequential for-loop) — with 20+ holdings the old
    // version could take many seconds since every symbol's lookups ran one
    // after another instead of concurrently.
    const results = await Promise.all(symbols.map(async (s): Promise<Quote> => {
      const sym = (s || "").trim().toUpperCase();
      const mock = MOCK_UNIVERSE.find((q) => q.symbol === sym || q.ticker === sym);
      if (mock && mock.category && ["CRYPTO", "FX", "COMMODITY"].includes(mock.category)) {
        return findMock(sym);
      }
      if (hasFinnhub()) {
        try {
          const q = await buildQuote(sym);
          // See fetchQuote above: Finnhub returns a zeroed-out 200 (not an
          // error) for unrecognized symbols, so price>0 is required too.
          if (q.price != null && q.price > 0) {
            if (mock) {
              q.category = mock.category;
              q.sector = q.sector || mock.industry;
              q.type = q.type || mock.type;
            }
            return q;
          }
        } catch {
          // ignore, fall back
        }
      }
      // Real Yahoo quote before the fictional ticker-derived mock price.
      const yq = await fetchYahooQuoteFull(sym);
      if (yq) {
        if (mock) {
          yq.category = mock.category;
          yq.sector = yq.sector || mock.industry;
          yq.type = yq.type || mock.type;
        }
        return yq;
      }
      return findMock(sym);
    }));
    return results;
  });

// ─── Market Status (open/closed) via Finnhub ────────────────────────────
interface FhMarketStatus {
  exchange?: string;
  holiday?: string | null;
  isOpen?: boolean;
  session?: string | null;
  timezone?: string;
  t?: number;
}

export interface MarketStatus {
  code: string;         // "US", "L", "MI", ...
  label: string;        // "NYSE / NASDAQ" ...
  isOpen: boolean;
  session: string;      // "pre-market" | "regular" | "post-market" | "closed"
  timezone: string;
  holiday: string | null;
}

const EXCHANGE_LABELS: Record<string, string> = {
  US: "NYSE / NASDAQ",
  L:  "LONDON",
  MI: "MILAN",
  T:  "TOKYO",
  HK: "HONG KONG",
  F:  "FRANKFURT",
  PA: "PARIS",
};

interface ExchangeHours { timezone: string; openMin: number; closeMin: number; }

const EXCHANGE_HOURS: Record<string, ExchangeHours> = {
  US: { timezone: "America/New_York", openMin: 9 * 60 + 30, closeMin: 16 * 60 },
  L:  { timezone: "Europe/London",     openMin: 8 * 60,      closeMin: 16 * 60 + 30 },
  MI: { timezone: "Europe/Rome",       openMin: 9 * 60,      closeMin: 17 * 60 + 30 },
};

function getLocalMinutesAndWeekday(timezone: string, now: Date): { minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { minutes: hour * 60 + minute, weekday: weekdayMap[get("weekday")] ?? -1 };
}

async function fetchExchangeStatus(code: string): Promise<MarketStatus> {
  const hours = EXCHANGE_HOURS[code];
  const label = EXCHANGE_LABELS[code] || code;
  if (!hours) {
    return { code, label, isOpen: false, session: "unknown", timezone: "UTC", holiday: null };
  }
  const now = new Date();
  const { minutes, weekday } = getLocalMinutesAndWeekday(hours.timezone, now);
  const isWeekday = weekday >= 1 && weekday <= 5;
  const isOpen = isWeekday && minutes >= hours.openMin && minutes < hours.closeMin;
  return {
    code,
    label,
    isOpen,
    session: isOpen ? "regular" : "closed",
    timezone: hours.timezone,
    holiday: null, // public holidays not accounted for yet — see note below
  };
}

export const fetchMarketStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { exchanges?: string[] } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const codes = data.exchanges && data.exchanges.length ? data.exchanges : ["US", "L", "MI"];
    return await Promise.all(codes.map(fetchExchangeStatus));
  });

// ---------------------------------------------------------------------------
// Historical price lookup — Finnhub first (paid tier), Yahoo Finance fallback.
// Used by the "ADD TO PORTFOLIO" flow when the user picks a past purchase date.
// ---------------------------------------------------------------------------
export interface HistoricalPrice {
  price: number | null;
  source: "finnhub" | "yahoo" | null;
  actualDate: string | null; // trading day actually used (YYYY-MM-DD)
  reason?: string;           // populated when price is null
}
interface YahooChartResult {
  chart?: {
    result?: Array<{ meta: { regularMarketPrice?: number; currency?: string } }>;
    error?: unknown;
  };
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; currency: string } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)" } });
    if (!r.ok) return null;
    const j = (await r.json()) as YahooChartResult;
    const meta = j.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return { price: meta.regularMarketPrice, currency: meta.currency || "USD" };
  } catch (e) {
    console.warn("[Yahoo quote] error:", (e as Error).message);
    return null;
  }
}

interface YahooQuoteMetaResult {
  chart?: {
    result?: Array<{
      meta: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketPreviousClose?: number;
        chartPreviousClose?: number;
        currency?: string;
        exchangeName?: string;
        longName?: string;
        shortName?: string;
        instrumentType?: string;
        exchangeTimezoneName?: string;
      };
    }>;
    error?: unknown;
  };
}

// Real current-price fallback for tickers Finnhub doesn't cover (e.g. European
// exchanges like Borsa Italiana `.MI`) or when Finnhub isn't configured at all.
// Used instead of `findMock()`'s made-up price so an unmocked security shows a
// real quote rather than a deterministic-but-fictional number derived from its
// ticker's first letter — see fetchQuote/batchRefresh below.
async function fetchYahooQuoteFull(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)" } });
    if (!r.ok) return null;
    const j = (await r.json()) as YahooQuoteMetaResult;
    const meta = j.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? null;
    const dayChangePct = prev != null && prev !== 0 ? ((price - prev) / prev) * 100 : null;
    const sym = symbol.trim().toUpperCase();
    return {
      symbol: sym, ticker: sym,
      shortName: meta.longName || meta.shortName || sym,
      price, previousClose: prev, dayChangePct,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "—",
      marketCap: null, pe: null, dividendYield: null,
      type: meta.instrumentType || "Equity",
      // This chart endpoint (unlike quoteSummary) needs no crumb, so these
      // two are reliable regardless of Yahoo's crumb auth working or not —
      // previously left unset here entirely, which meant any quote that
      // fell through to this path (Finnhub unconfigured/failed, e.g. most
      // non-US exchanges) had no category or geo at all further downstream.
      category: inferCategoryFromType(meta.instrumentType || ""),
      geo: geoFromExchangeTimezone(meta.exchangeTimezoneName),
    };
  } catch (e) {
    console.warn("[Yahoo full quote] error:", symbol, (e as Error).message);
    return null;
  }
}
// Yahoo's quoteSummary endpoint (unlike its search/chart endpoints) now
// requires a session cookie + "crumb" token — cached process-wide and
// refreshed on expiry/failure so normal quote lookups only pay for it once
// every few hours, not on every request.
let yahooCrumbCache: { cookie: string; crumb: string; fetchedAt: number } | null = null;
const YAHOO_CRUMB_TTL_MS = 12 * 60 * 60 * 1000;

async function getYahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  if (yahooCrumbCache && Date.now() - yahooCrumbCache.fetchedAt < YAHOO_CRUMB_TTL_MS) {
    return yahooCrumbCache;
  }
  const ua = "Mozilla/5.0 (StrategicMarkets)";
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", { headers: { "user-agent": ua } });
    const setCookie = cookieRes.headers.get("set-cookie");
    if (!setCookie) return null;
    const cookie = setCookie.split(";")[0];
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "user-agent": ua, cookie },
    });
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes("<")) return null; // error page, not a real crumb
    yahooCrumbCache = { cookie, crumb, fetchedAt: Date.now() };
    return yahooCrumbCache;
  } catch (e) {
    console.warn("[Yahoo crumb]", (e as Error).message);
    return null;
  }
}

// Yahoo's fund sector-weighting keys → display labels. Anything not in this
// map (rare/new categories) falls back to the raw key rather than being
// dropped, so a portfolio evaluation never silently loses a slice of a fund.
const YAHOO_SECTOR_LABELS: Record<string, string> = {
  realestate: "Real Estate",
  consumer_cyclical: "Consumer Cyclical",
  basic_materials: "Basic Materials",
  consumer_defensive: "Consumer Defensive",
  technology: "Technology",
  communication_services: "Communication Services",
  financial_services: "Financial Services",
  utilities: "Utilities",
  industrials: "Industrials",
  energy: "Energy",
  healthcare: "Healthcare",
};

interface YahooProfileResult {
  quoteSummary?: {
    result?: Array<{
      assetProfile?: { sector?: string; industry?: string };
      // Equity-fund holdings breakdown — present for ETFs/mutual funds,
      // absent for individual stocks. Each entry is `{ [sectorKey]: { raw } }`,
      // already expressed as a fraction of the fund's TOTAL value (not just
      // its equity sleeve), so no re-normalization is needed downstream.
      topHoldings?: { sectorWeightings?: Array<Record<string, { raw?: number }>> };
    }>;
  };
}

// Combines what used to be two lookups (assetProfile for stock sector,
// nothing at all for ETF sectors — they came back "OTHER" everywhere) into
// one quoteSummary call: a stock gets `sector`/`industry` same as before,
// and a fund additionally gets `sectorWeights` — its real look-through
// sector breakdown — instead of no sector data at all.
async function fetchYahooProfile(symbol: string): Promise<{ sector?: string; industry?: string; sectorWeights?: Record<string, number> } | null> {
  const auth = await getYahooCrumb();
  if (!auth) return null;
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,topHoldings&crumb=${encodeURIComponent(auth.crumb)}`;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)", cookie: auth.cookie } });
    if (!r.ok) {
      if (r.status === 401) yahooCrumbCache = null; // crumb expired server-side; refetch next call
      return null;
    }
    const j = (await r.json()) as YahooProfileResult;
    const result = j.quoteSummary?.result?.[0];
    if (!result) return null;

    const out: { sector?: string; industry?: string; sectorWeights?: Record<string, number> } = {};
    if (result.assetProfile?.sector) {
      out.sector = result.assetProfile.sector;
      out.industry = result.assetProfile.industry || result.assetProfile.sector;
    }
    const weightings = result.topHoldings?.sectorWeightings;
    if (weightings?.length) {
      const weights: Record<string, number> = {};
      for (const entry of weightings) {
        for (const [key, v] of Object.entries(entry)) {
          const raw = v?.raw;
          if (typeof raw === "number" && raw > 0) {
            const label = YAHOO_SECTOR_LABELS[key] || key;
            weights[label] = (weights[label] || 0) + raw;
          }
        }
      }
      if (Object.keys(weights).length) out.sectorWeights = weights;
    }
    return (out.sector || out.sectorWeights) ? out : null;
  } catch (e) {
    console.warn("[Yahoo profile]", symbol, (e as Error).message);
    return null;
  }
}

// Applies fetchYahooProfile's result onto a Quote in place: sector/industry
// same as the old fetchYahooSector did, plus sectorWeights when this turns
// out to be a fund — and if nothing else has classified it as an ETF yet
// (e.g. Finnhub's profile2 doesn't distinguish funds from stocks at all),
// having real sector-weighting data back is itself strong evidence it is one.
async function applyYahooProfile(q: Quote, symbol: string): Promise<void> {
  const profile = await fetchYahooProfile(symbol);
  if (!profile) return;
  if (profile.sector) {
    q.sector = profile.sector;
    q.industry = profile.industry;
  }
  if (profile.sectorWeights) {
    q.sectorWeights = profile.sectorWeights;
    if (!q.category) q.category = "ETF";
  }
}
/** Convert 'YYYY-MM-DD' → unix seconds at 00:00 UTC. */
function ymdToUnix(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 1000);
}

async function finnhubCandleClose(symbol: string, ymd: string): Promise<number | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  // Look back 7 calendar days to catch weekends / holidays before the target date.
  const to = ymdToUnix(ymd) + 86400;         // include the target day
  const from = to - 8 * 86400;
  const url = `${BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${key}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      // 403 on free tier for US stocks is the common case — signal to fallback.
      return null;
    }
    const j = (await r.json()) as { c?: number[]; t?: number[]; s?: string };
    if (j.s !== "ok" || !j.c || !j.c.length || !j.t || !j.t.length) return null;
    // Prefer the close on-or-before the target day.
    const target = ymdToUnix(ymd);
    let bestIdx = -1;
    for (let i = 0; i < j.t.length; i++) {
      if (j.t[i] <= target + 86400) bestIdx = i;
    }
    if (bestIdx < 0) bestIdx = j.t.length - 1;
    const px = j.c[bestIdx];
    return typeof px === "number" && isFinite(px) ? px : null;
  } catch (e) {
    console.warn("[Finnhub candle] error:", (e as Error).message);
    return null;
  }
}

async function yahooCandleClose(
  symbol: string,
  ymd: string,
): Promise<{ price: number; actualDate: string } | null> {
  // Yahoo Finance unofficial chart API (widely used, no auth).
  const to = ymdToUnix(ymd) + 86400 * 2;
  const from = ymdToUnix(ymd) - 86400 * 7; // widen window to handle weekends/holidays
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?period1=${from}&period2=${to}&interval=1d&includePrePost=false`;
  try {
    const r = await fetch(url, {
      // Yahoo blocks obvious non-browser UAs on some routes; a generic UA is fine.
      headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)" },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
      };
    };
    const res = j.chart?.result?.[0];
    const ts = res?.timestamp;
    const closes = res?.indicators?.quote?.[0]?.close;
    if (!ts || !closes || !ts.length || !closes.length) return null;

    const target = ymdToUnix(ymd);
    let bestIdx = -1;
    for (let i = 0; i < ts.length; i++) {
      if (ts[i] <= target + 86400 && closes[i] != null) bestIdx = i;
    }
    if (bestIdx < 0) {
      for (let i = 0; i < ts.length; i++) {
        if (closes[i] != null) { bestIdx = i; break; }
      }
    }
    if (bestIdx < 0) return null;
    const px = closes[bestIdx];
    if (px == null || !isFinite(px)) return null;
    const actual = new Date(ts[bestIdx] * 1000).toISOString().slice(0, 10);
    return { price: px, actualDate: actual };
  } catch (e) {
    console.warn("[Yahoo chart] error:", (e as Error).message);
    return null;
  }
}

export const fetchHistoricalPrice = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string; date: string }) => d)
  .handler(async ({ data }): Promise<HistoricalPrice> => {
    const symbol = (data.symbol || "").trim().toUpperCase();
    const date = (data.date || "").trim(); // expected YYYY-MM-DD
    if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { price: null, source: null, actualDate: null, reason: "invalid input" };
    }
    // Reject future dates — historical only.
    if (ymdToUnix(date) > Math.floor(Date.now() / 1000)) {
      return { price: null, source: null, actualDate: null, reason: "date is in the future" };
    }

    // 1) Try Finnhub (paid tier required for US equity candles).
    const fh = await finnhubCandleClose(symbol, date);
    if (fh != null) {
      return { price: fh, source: "finnhub", actualDate: date };
    }

    // 2) Fallback to Yahoo Finance chart API.
    const yh = await yahooCandleClose(symbol, date);
    if (yh) {
      return { price: yh.price, source: "yahoo", actualDate: yh.actualDate };
    }

    return {
      price: null,
      source: null,
      actualDate: null,
      reason: "no historical data available for this symbol/date",
    };
  });
// Generic FX rates: given a base currency and a list of other currencies,
// returns a map of `rates[CCY]` = how many units of `base` one unit of CCY
// is worth (so `valueInBase = valueInCCY * rates[CCY]`). `rates[base]` is
// always 1. Backed by the same Yahoo quote endpoint as the old hardcoded
// EUR/GBP-only version, just parameterized over an arbitrary currency list.
export const fetchFxRates = createServerFn({ method: "GET" })
  .inputValidator((d: { base?: string; currencies?: string[] } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const base = (data.base || "USD").toUpperCase();
    const currencies = Array.from(new Set(
      (data.currencies || []).map(c => (c || "").toUpperCase()).filter(c => c && c !== base)
    ));
    const rates: Record<string, number> = { [base]: 1 };
    if (currencies.length) {
      const quotes = await Promise.all(currencies.map(c => fetchYahooQuote(`${c}${base}=X`)));
      currencies.forEach((c, i) => { if (quotes[i]?.price != null) rates[c] = quotes[i]!.price; });
    }
    return { base, rates, fetchedAt: Date.now() };
});
interface YahooChartSeriesResult {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number|null)[] }> };
    }>;
    error?: unknown;
  };
}

export const fetchPriceHistory = createServerFn({ method: "GET" })
  .inputValidator((d: { symbol: string; range: string; interval: string }) => d)
  .handler(async ({ data }) => {
    const { symbol, range, interval } = data;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    try {
      const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (StrategicMarkets)" } });
      if (!r.ok) return [];
      const j = (await r.json()) as YahooChartSeriesResult;
      const result = j.chart?.result?.[0];
      if (!result || j.chart?.error) return [];
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      return timestamps
        .map((t, i) => ({ t: t * 1000, close: closes[i] }))
        .filter((p) => p.close != null);
    } catch (e) {
      console.warn("[Yahoo history]", symbol, (e as Error).message);
      return [];
    }
  });
