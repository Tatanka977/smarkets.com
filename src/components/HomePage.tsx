import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import {
  B, fmt, fmtM, pCol, pSign, pMet, buildPortfolioContext,
} from "@/lib/uiShared";
import { upsertSnapshot, getSnapshots } from "@/lib/profile.functions";
import { fetchPriceHistory as srvPriceHistory } from "@/lib/finance.functions";
import { fetchMarketStatus as srvMarketStatus, batchRefresh as srvBatchRefresh } from "@/lib/finance.functions";
import { fetchMarketNews as srvMarketNews } from "@/lib/news.functions";
import { aiChatAsUser } from "@/lib/ai.functions";
import { listFollowedPosts, listAllCommunityPosts } from "@/lib/community.functions";
import { usePersistentState } from "@/hooks/usePersistentState";

const FONT = "'Courier New', Courier, monospace";
const CARD = { background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12 };

const EXCHANGES = [
  { code: "US", label: "NYSE / NASDAQ", indexSymbol: "SPY" },
  { code: "L",  label: "LONDON", indexSymbol: "^FTSE" },
  { code: "MI", label: "MILAN", indexSymbol: "FTSEMIB.MI" },
];

const INDICES = [
  { sym: "SPY", label: "S&P 500 ETF" },
  { sym: "QQQ", label: "NASDAQ 100" },
  { sym: "DIA", label: "DOW JONES" },
  { sym: "IWM", label: "RUSSELL 2000" },
  { sym: "VIX", label: "VOLATILITY" },
  { sym: "TLT", label: "20YR TREASURY" },
];

const BENCHMARKS = [
  { sym: "SPY", label: "S&P 500" },
  { sym: "QQQ", label: "NASDAQ 100" },
  { sym: "ACWI", label: "MSCI ACWI" },
];

// Maps a real intraday close-price series onto the sparkline's viewBox.
function sparklinePoints(values: number[], width = 96, height = 24, pad = 2): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // flat session — avoid divide-by-zero
  const n = values.length;
  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * width;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function MiniSparkline({ values, color, loading }: { values: number[]; color: string; loading?: boolean }) {
  const points = sparklinePoints(values);
  if (loading || !points) {
    return (
      <svg width="90" height="24" viewBox="0 0 96 24" style={{ opacity: 0.25 }}>
        <line x1="0" y1="12" x2="96" y2="12" stroke={color} strokeWidth="1.5" strokeDasharray="2,3" />
      </svg>
    );
  }
  return (
    <svg width="90" height="24" viewBox="0 0 96 24" style={{ opacity: 0.7 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function GlobalMarketStatus() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [series, setSeries] = useState<Record<string, number[]>>({});
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    srvMarketStatus({ data: { exchanges: EXCHANGES.map(e => e.code) } }).then((d: any) => {
      if (alive) setStatuses(d || []);
    }).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Real intraday close-price series for each exchange's representative
  // index, from the session's open to its most recent (or final) print —
  // not a decorative placeholder.
  useEffect(() => {
    let alive = true;
    Promise.all(
      EXCHANGES.map((ex) =>
        srvPriceHistory({ data: { symbol: ex.indexSymbol, range: "1d", interval: "5m" } }).catch(() => [])
      )
    ).then((results: any[]) => {
      if (!alive) return;
      const next: Record<string, number[]> = {};
      EXCHANGES.forEach((ex, i) => {
        next[ex.code] = (results[i] || [])
          .map((p: any) => p.close)
          .filter((c: any) => typeof c === "number");
      });
      setSeries(next);
      setSeriesLoading(false);
    }).catch(() => { if (alive) setSeriesLoading(false); });
    return () => { alive = false; };
  }, []);

  const fmtLocal = (tz: string) => {
    try { return new Date(now).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }); }
    catch { return "--:--"; }
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 8, fontFamily: FONT }}>
        GLOBAL MARKET STATUS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {EXCHANGES.map((ex) => {
          const s = statuses.find((x: any) => x.code === ex.code);
          const isOpen = s?.isOpen;
          const color = s?.holiday ? B.yellow : isOpen ? B.green : B.red;
          const values = series[ex.code] || [];
          const trendColor = values.length >= 2
            ? (values[values.length - 1] >= values[0] ? B.green : B.red)
            : color;
          return (
            <div key={ex.code} style={{ ...CARD, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{ex.label}</span>
                </div>
                <div style={{ fontSize: 12, color, fontWeight: 700, fontFamily: FONT }}>
                  {s?.holiday ? "HOLIDAY" : isOpen ? "OPEN" : "CLOSED"}
                </div>
                <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>{fmtLocal(s?.timezone)} local</div>
              </div>
              <MiniSparkline values={values} color={trendColor} loading={seriesLoading} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeyIndices() {
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  useEffect(() => {
    let alive = true;
    srvBatchRefresh({ data: { symbols: INDICES.map(i => i.sym) } }).then((list: any) => {
      if (alive) setQuotes(Object.fromEntries((list || []).map((q: any) => [q.symbol, q])));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 8, fontFamily: FONT }}>
        KEY INDICES — SNAPSHOT
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {INDICES.map((it) => {
          const q = quotes[it.sym];
          const chg = q?.dayChangePct;
          return (
            <div key={it.sym} style={{ ...CARD, padding: "10px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.blue, fontFamily: FONT }}>{it.sym}</div>
              <div style={{ fontSize: 10, color: B.gray3, marginBottom: 6, fontFamily: FONT }}>{it.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>
                {q?.price != null ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "…"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: pCol(chg), fontFamily: FONT }}>
                {chg != null ? `${pSign(fmt(chg, 2))}%` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatField({ label, value, sub, color }: any) {
  return (
    <div>
      <div style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || B.gray1, fontFamily: FONT }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT }}>{sub}</div>}
    </div>
  );
}

function PortfolioOverview({ holdings, transactions, m }: any) {
  const hasHoldings = holdings.length > 0;
  const totalCost = holdings.reduce((s: number, h: any) => s + (h.costBasis ?? (h.costPrice || 0) * h.qty), 0);
  const totalPL = holdings.reduce((s: number, h: any) => s + (h.value - (h.costBasis ?? (h.costPrice || 0) * h.qty)), 0);
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost * 100) : 0;
  const cash = holdings.reduce((s: number, h: any) => s + (h.asset.category === "CASH" ? h.value : 0), 0);
  const thisYear = new Date().getFullYear();
  const realizedYtd = (transactions || [])
    .filter((t: any) => t.type === "SELL" && t.realizedPnl != null && new Date(t.date).getFullYear() === thisYear)
    .reduce((s: number, t: any) => s + t.realizedPnl, 0);
  const hasSells = (transactions || []).some((t: any) => t.type === "SELL");
  const hasForeignCcy = holdings.some((h: any) => h.asset.currency && h.asset.currency !== "USD");

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasForeignCcy ? 4 : 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>PORTFOLIO OVERVIEW</span>
      </div>
      {hasForeignCcy && (
        <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, marginBottom: 12 }}>
          Base currency: USD — non-USD holdings converted using live FX rates.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
        <StatField label="Total Portfolio Value" value={hasHoldings ? `$${fmtM(m.total)}` : "—"} />
        <StatField label="Portfolio Return (Exp.)" value={hasHoldings ? `${pSign(fmt(m.wRet,1))}%` : "—"} color={hasHoldings ? pCol(m.wRet) : undefined} />
        <StatField label="Day Change" value={hasHoldings ? `${pSign(fmt(m.wDay,2))}%` : "—"} color={hasHoldings ? pCol(m.wDay) : undefined} />
        <StatField label="Cash" value={cash > 0 ? `$${fmtM(cash)}` : "—"} sub={cash > 0 ? undefined : "No cash added yet"} />
      </div>

      <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
        <StatField label="Unrealized P/L" value={hasHoldings ? `${totalPL>=0?"+":"−"}$${fmtM(Math.abs(totalPL))}` : "—"} sub={hasHoldings ? `(${pSign(fmt(totalPLPct,1))}%)` : undefined} color={hasHoldings ? pCol(totalPL) : undefined} />
        <StatField label="Realized P/L (YTD)" value={hasSells ? `${realizedYtd>=0?"+":"−"}$${fmtM(Math.abs(realizedYtd))}` : "—"} sub={hasSells ? undefined : "No sales yet"} color={hasSells ? pCol(realizedYtd) : undefined} />
        <StatField label="Buying Power" value="—" sub="Not tracked yet" />
        <StatField label="Portfolio Status" value={hasHoldings ? <span style={{ color: B.green }}>● Active</span> : <span style={{ color: B.gray3 }}>— Empty</span>} />
      </div>
    </div>
  );
}

function PerformancePanel({ holdings }: any) {
  const [range, setRange] = useState<"1M"|"3M"|"6M"|"YTD"|"1Y"|"ALL">("ALL");
  const [benchmark, setBenchmark] = useState("SPY");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string|null>(null);
  const benchmarkLabel = BENCHMARKS.find(b => b.sym === benchmark)?.label || benchmark;

  useEffect(() => {
    let alive = true;
    const withDates = holdings.filter((h:any) => h.buyDate);
    if (!withDates.length) { setLoading(false); setChartData([]); return; }
    setLoading(true);

    const earliest = withDates.reduce((min:string,h:any)=> h.buyDate < min ? h.buyDate : min, withDates[0].buyDate);
    setEarliestDate(earliest);

    Promise.all([
      srvPriceHistory({ data: { symbol: benchmark, range: "max", interval: "1d" } }),
      ...withDates.map((h:any) =>
        srvPriceHistory({ data: { symbol: h.asset.ticker, range: "max", interval: "1d" } })
          .then((series:any) => ({ ticker: h.asset.ticker, qty: h.qty, buyDt: h.buyDate, series: series || [] }))
      ),
    ]).then(([spy, ...perHolding]: any) => {
      if (!alive) return;

      // Only trading days from the earliest purchase date onward
      const earliestT = new Date(earliest).getTime();
      const days = (spy || []).filter((p:any) => p.t >= earliestT).map((p:any) => p.t);

      // Forward-fill pointer per holding for efficiency
      const pointers = perHolding.map(() => 0);

      const series = days.map((t:number) => {
        let portfolioValue = 0;
        perHolding.forEach((h:any, idx:number) => {
          if (new Date(h.buyDt).getTime() > t) return; // not yet purchased on this day
          while (pointers[idx] + 1 < h.series.length && h.series[pointers[idx]+1].t <= t) pointers[idx]++;
          const price = h.series[pointers[idx]]?.close;
          if (price != null) portfolioValue += price * h.qty;
        });
        return { t, portfolioValue };
      }).filter((d:any) => d.portfolioValue > 0);

      const base = series[0]?.portfolioValue;
      const spyBase = spy?.find((p:any)=>p.t>=series[0]?.t)?.close;

      const merged = series.map((s:any) => {
        const spyPoint = spy.reduce((best:any,p:any)=> (p.t<=s.t ? p : best), null);
        return {
          label: new Date(s.t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"2-digit"}),
          t: s.t,
          portfolio: base ? ((s.portfolioValue - base)/base)*100 : 0,
          benchmark: (spyPoint && spyBase) ? ((spyPoint.close - spyBase)/spyBase)*100 : null,
        };
      });

      setChartData(merged);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [holdings, benchmark]);

  const filtered = useMemo(() => {
    if (!chartData.length) return [];
    if (range === "ALL") return chartData;
    const cutoffDays: Record<string, number> = {"1M":30,"3M":90,"6M":180,"1Y":365,"YTD":9999};
    const now = Date.now();
    if (range === "YTD") return chartData.filter((d:any) => new Date(d.t).getFullYear() === new Date().getFullYear());
    return chartData.filter((d:any) => (now - d.t) <= cutoffDays[range]*86400000);
  }, [chartData, range]);

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>PERFORMANCE</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {BENCHMARKS.map(b => (
              <button key={b.sym} onClick={() => setBenchmark(b.sym)} style={{
                background: benchmark === b.sym ? B.panel2 : "transparent", color: benchmark === b.sym ? B.gray1 : B.gray3,
                border: `1px solid ${benchmark === b.sym ? B.border : "transparent"}`, fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 6,
                cursor: "pointer", fontFamily: FONT,
              }}>{b.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {(["1M","3M","6M","YTD","1Y","ALL"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                background: range === r ? B.blue : "transparent", color: range === r ? B.white : B.gray2,
                border: "none", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                cursor: "pointer", fontFamily: FONT,
              }}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: B.panel2, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT }}>LOADING…</div>
        </div>
      ) : filtered.length < 2 ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: B.panel2, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, textAlign: "center", padding: "0 20px", lineHeight: 1.6 }}>
            {holdings.length ? "Not enough historical price data for this range yet." : "Add positions with a purchase date to see this chart."}
          </div>
        </div>
      ) : (
        <div style={{ height: 280, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <XAxis dataKey="label" tick={{fontSize:11,fill:B.gray3}} minTickGap={50} axisLine={{stroke:B.border}} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:B.gray3}} tickFormatter={(v)=>`${v.toFixed(0)}%`} axisLine={false} tickLine={false} width={45}/>
              <Tooltip formatter={(v:any)=>v!=null?`${v.toFixed(2)}%`:"—"} contentStyle={{fontFamily:FONT,fontSize:12,borderRadius:8}}/>
              <ReferenceLine y={0} stroke={B.border}/>
              <Line type="monotone" dataKey="portfolio" stroke={B.blue} strokeWidth={2.5} dot={false} name="Your Portfolio"/>
              <Line type="monotone" dataKey="benchmark" stroke={B.gray3} strokeWidth={1.5} dot={false} name={benchmarkLabel}/>
              <Legend wrapperStyle={{fontSize:12,fontFamily:FONT}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
// Reddit-style community callout: the latest posts from the topics the
// user follows, or — if they don't follow any topic yet — the latest
// posts across the whole Community Home feed, so this card is never
// empty just because someone hasn't followed anything yet. Clicking a
// post reuses the same pending-post handoff NotificationBell/the profile
// page use to jump the terminal straight to that post in COMMUNITY.
function CommunityCallout({ setPage }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMode, setFollowingMode] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const followed = await listFollowedPosts({ data: { limit: 5 } });
        if (!alive) return;
        if (followed.length) {
          setPosts(followed); setFollowingMode(true);
        } else {
          const home = await listAllCommunityPosts({ data: { sort: "recent" } });
          if (!alive) return;
          setPosts((home || []).slice(0, 5)); setFollowingMode(false);
        }
      } catch {
        if (alive) setPosts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const openPost = (id: string) => {
    try { window.localStorage.setItem("moneta_community_pending_post", JSON.stringify(id)); } catch {}
    setPage("community");
  };

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>
          {followingMode ? "FROM TOPICS YOU FOLLOW" : "COMMUNITY"}
        </span>
        <button onClick={() => setPage("community")} style={{
          background: "none", border: "none", color: B.blue, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700,
        }}>VIEW ALL →</button>
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, padding: "10px 0" }}>LOADING…</div>
      ) : !posts.length ? (
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, padding: "10px 0" }}>No discussions yet — be the first to write one.</div>
      ) : (
        posts.map((p: any) => (
          <div key={p.id} onClick={() => openPost(p.id)} style={{ padding: "8px 0", borderTop: `1px solid ${B.border}`, cursor: "pointer" }}>
            <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, lineHeight: 1.4, marginBottom: 3 }}>{p.title}</div>
            <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>
              {p.community_channels?.name || "No topic"} · u/{p.author_name} · {p.score} pts
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MarketNewsCard() {
  const [news, setNews] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    srvMarketNews({ data: { category: "general" } }).then((d: any) => { if (alive) setNews(d || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 10 }}>
        MARKET NEWS
      </div>
      {news.slice(0, 4).map((n: any) => (
        <div key={n.id} style={{ padding: "8px 0", borderTop: `1px solid ${B.border}` }}>
          <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, lineHeight: 1.4, marginBottom: 3 }}>{n.headline}</div>
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>
            {n.source} · {new Date(n.datetime * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailySummaryCard({ holdings }: any) {
  const todayYmd = new Date().toISOString().slice(0,10);
  const portfolioHash = useMemo(() => holdings.map((h:any) => `${h.asset.ticker}:${h.qty}`).sort().join("|"), [holdings]);
  const [cache, setCache] = usePersistentState<{date:string; hash:string; summary:string} | null>("daily_ai_summary", null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isFresh = cache && cache.date === todayYmd && cache.hash === portfolioHash;

  const generate = async () => {
    if (!holdings.length) return;
    setBusy(true); setError("");
    try {
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL analytics assistant. Write a short (max 120 words) daily portfolio summary: 1-2 notable observations about today's positioning, framed as quantitative/educational, no personalized advice. End with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."`;
      const prompt = `Today's portfolio snapshot:\n${buildPortfolioContext(holdings)}\n\nWrite today's summary.`;
      const { reply } = await aiChatAsUser({ messages: [{ role: "user", content: prompt }], system: sys });
      setCache({ date: todayYmd, hash: portfolioHash, summary: reply });
    } catch (e: any) {
      setError("AI error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!holdings.length) return null;

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>TODAY'S AI SUMMARY</span>
        <button onClick={generate} disabled={busy} style={{
          background: "transparent", border: `1px solid ${B.cyan}`, color: B.cyan, padding: "4px 10px", borderRadius: 6,
          cursor: busy ? "wait" : "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700,
        }}>{busy ? "GENERATING…" : isFresh ? "↻ REFRESH" : "GENERATE"}</button>
      </div>
      {error && <div style={{ fontSize: 11, color: B.red, fontFamily: FONT }}>{error}</div>}
      {isFresh ? (
        <div style={{ fontSize: 12, color: B.gray1, fontFamily: FONT, lineHeight: 1.6 }}>
          {cache!.summary.split("\n").map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return <div key={i} style={{ marginBottom: 4 }}>{parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <b key={j} style={{ color: B.blue }}>{p.slice(2,-2)}</b> : p)}</div>;
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, lineHeight: 1.6 }}>
          Tap Generate for a short AI recap of today's portfolio positioning — educational only, cached for the day.
        </div>
      )}
    </div>
  );
}

export default function HomePage({ holdings, transactions, setPage, onRefresh, refreshing }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: B.bg }}>
      <GlobalMarketStatus />
      <KeyIndices />

      {!holdings.length && (
        <div style={{ ...CARD, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, color: B.gray2, fontFamily: FONT }}>No securities in your portfolio yet.</span>
          <button onClick={() => setPage("search")} style={{
            background: B.blue, border: "none", color: B.white, padding: "8px 20px", cursor: "pointer",
            fontFamily: FONT, fontSize: 14, fontWeight: 700, borderRadius: 8,
          }}>SEARCH SECURITIES</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
        <PortfolioOverview holdings={holdings} transactions={transactions} m={m} />
        <CommunityCallout setPage={setPage} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <PerformancePanel holdings={holdings}/>
        <MarketNewsCard />
      </div>

      <DailySummaryCard holdings={holdings} />

      <div style={{ textAlign: "right" }}>
        <button onClick={onRefresh} disabled={refreshing || !holdings.length} style={{
          background: "none", border: `1px solid ${B.border}`, color: (refreshing || !holdings.length) ? B.gray3 : B.blue,
          fontFamily: FONT, fontSize: 12, cursor: (refreshing || !holdings.length) ? "not-allowed" : "pointer", padding: "4px 10px", borderRadius: 6,
        }}>{refreshing ? "UPDATING..." : "↻ REFRESH"}</button>
    </div>
    </div>
  );
}
