import { useState, useEffect, useMemo } from "react";
import {
  B, fmt, fmtM, pCol, pSign, pMet, BPanel,
} from "@/lib/uiShared";
import { fetchMarketStatus as srvMarketStatus, batchRefresh as srvBatchRefresh } from "@/lib/finance.functions";
import { fetchMarketNews as srvMarketNews } from "@/lib/news.functions";
import { savePortfolio } from "@/lib/profile.functions";
import { useUser } from "@/hooks/useUser";

const FONT = "'Courier New', Courier, monospace";
const CARD = { background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12 };

const EXCHANGES = [
  { code: "US", label: "NYSE / NASDAQ" },
  { code: "L",  label: "LONDON" },
  { code: "MI", label: "MILAN" },
];

const INDICES = [
  { sym: "SPY", label: "S&P 500 ETF" },
  { sym: "QQQ", label: "NASDAQ 100" },
  { sym: "DIA", label: "DOW JONES" },
  { sym: "IWM", label: "RUSSELL 2000" },
  { sym: "VIX", label: "VOLATILITY" },
  { sym: "TLT", label: "20YR TREASURY" },
];

function MiniSparkline({ color }: { color: string }) {
  const pts = "0,18 8,14 16,16 24,9 32,12 40,6 48,10 56,4 64,8 72,3 80,7 88,2 96,5";
  return (
    <svg width="90" height="24" viewBox="0 0 96 24" style={{ opacity: 0.5 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function GlobalMarketStatus() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    srvMarketStatus({ data: { exchanges: EXCHANGES.map(e => e.code) } }).then((d: any) => {
      if (alive) setStatuses(d || []);
    }).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(t); };
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
              <MiniSparkline color={color} />
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

function PortfolioOverview({ holdings, m, onSave, saving, saveMsg }: any) {
  const totalCost = holdings.reduce((s: number, h: any) => s + (h.costBasis ?? (h.costPrice || 0) * h.qty), 0);
  const totalPL = holdings.reduce((s: number, h: any) => s + (h.value - (h.costBasis ?? (h.costPrice || 0) * h.qty)), 0);
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost * 100) : 0;

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>PORTFOLIO OVERVIEW</span>
        <button onClick={onSave} disabled={saving} style={{
          background: "none", border: `1px solid ${B.border}`, color: B.blue, fontFamily: FONT,
          fontSize: 12, cursor: saving ? "wait" : "pointer", padding: "4px 10px", borderRadius: 6,
        }}>{saving ? "..." : saveMsg || "SAVE"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 16 }}>
        <StatField label="Total Portfolio Value" value={`$${fmtM(m.total)}`} />
        <StatField label="Portfolio Return (Exp.)" value={`${pSign(fmt(m.wRet,1))}%`} color={pCol(m.wRet)} />
        <StatField label="Day Change" value={`${pSign(fmt(m.wDay,2))}%`} color={pCol(m.wDay)} />
        <StatField label="Cash" value="—" sub="Not tracked yet" />
      </div>

      <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
        <StatField label="Unrealized P/L" value={`${totalPL>=0?"+":"−"}$${fmtM(Math.abs(totalPL))}`} sub={`(${pSign(fmt(totalPLPct,1))}%)`} color={pCol(totalPL)} />
        <StatField label="Realized P/L (YTD)" value="—" sub="Not tracked yet" />
        <StatField label="Buying Power" value="—" sub="Not tracked yet" />
        <StatField label="Portfolio Status" value={<span style={{ color: B.green }}>● Active</span>} />
      </div>
    </div>
  );
}

function PerformancePanel() {
  const [range, setRange] = useState("YTD");
  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>PERFORMANCE</span>
        <div style={{ display: "flex", gap: 2 }}>
          {["1M","3M","6M","YTD","1Y","ALL"].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              background: range === r ? B.blue : "transparent", color: range === r ? B.white : B.gray2,
              border: "none", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              cursor: "pointer", fontFamily: FONT,
            }}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: B.panel2, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, textAlign: "center", padding: "0 20px", lineHeight: 1.6 }}>
          Historical performance vs. S&amp;P 500 is coming soon — it needs your portfolio's value tracked over time, which isn't stored yet.
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ holdings }: any) {
  const rows = [...holdings]
    .filter((h: any) => h.buyDt)
    .sort((a: any, b: any) => new Date(b.buyDt).getTime() - new Date(a.buyDt).getTime())
    .slice(0, 5);

  return (
    <div style={{ ...CARD, padding: "16px 18px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 10 }}>
        RECENT ACTIVITY
      </div>
      {!rows.length ? (
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, padding: "10px 0" }}>No positions added yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
          <thead>
            <tr style={{ color: B.gray3, fontSize: 10 }}>
              <th style={{ textAlign: "left", paddingBottom: 6 }}>TYPE</th>
              <th style={{ textAlign: "left", paddingBottom: 6 }}>SECURITY</th>
              <th style={{ textAlign: "right", paddingBottom: 6 }}>AMOUNT</th>
              <th style={{ textAlign: "right", paddingBottom: 6 }}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h: any) => (
              <tr key={h.isin || h.asset.ticker} style={{ borderTop: `1px solid ${B.border}` }}>
                <td style={{ padding: "8px 0" }}>
                  <span style={{ background: "rgba(0,200,120,0.12)", color: B.green, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>BUY</span>
                </td>
                <td style={{ padding: "8px 0", fontSize: 12, color: B.gray1 }}>{h.asset.shortName || h.asset.ticker}</td>
                <td style={{ padding: "8px 0", fontSize: 12, color: B.red, textAlign: "right" }}>
                  −${fmtM((h.costPrice || 0) * h.qty)}
                </td>
                <td style={{ padding: "8px 0", fontSize: 12, color: B.gray3, textAlign: "right" }}>
                  {new Date(h.buyDt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

export default function HomePage({ holdings, setPage, onRefresh, refreshing }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const handleSave = async () => {
    if (!user) { window.location.href = "/auth"; return; }
    const name = prompt("Portfolio name:", "Portfolio " + new Date().toLocaleDateString());
    if (!name) return;
    setSaving(true);
    try {
      await savePortfolio({ data: { name, holdings } });
      setSaveMsg("✓ SAVED");
    } catch (e: any) { setSaveMsg("ERROR: " + e.message); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2000); }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: B.bg }}>
      <GlobalMarketStatus />
      <KeyIndices />

      {!holdings.length ? (
        <div style={{ ...CARD, padding: "30px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: B.gray2, fontFamily: FONT, marginBottom: 12 }}>NO ACTIVE PORTFOLIO</div>
          <button onClick={() => setPage("search")} style={{
            background: B.blue, border: "none", color: B.white, padding: "8px 20px", cursor: "pointer",
            fontFamily: FONT, fontSize: 14, fontWeight: 700, borderRadius: 8,
          }}>SEARCH SECURITIES</button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            <PortfolioOverview holdings={holdings} m={m} onSave={handleSave} saving={saving} saveMsg={saveMsg} />
            <PerformancePanel />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            <RecentActivity holdings={holdings} />
            <MarketNewsCard />
          </div>

          <div style={{ textAlign: "right" }}>
            <button onClick={onRefresh} disabled={refreshing} style={{
              background: "none", border: `1px solid ${B.border}`, color: refreshing ? B.gray3 : B.blue,
              fontFamily: FONT, fontSize: 12, cursor: refreshing ? "not-allowed" : "pointer", padding: "4px 10px", borderRadius: 6,
            }}>{refreshing ? "UPDATING..." : "↻ REFRESH"}</button>
          </div>
        </>
      )}
    </div>
  );
}
