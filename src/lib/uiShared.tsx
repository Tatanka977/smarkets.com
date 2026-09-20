// Shared UI helpers used by PortfolioTerminal, HomePage, and AnalysisPage.
// Kept in its own file (no imports from those three) to avoid circular imports.

import { useState } from "react";
import { Link } from "@tanstack/react-router";

export const B = {
  bg:      "var(--sm-bg)",
  panel:   "var(--sm-panel)",
  panel2:  "var(--sm-panel2)",
  border:  "var(--sm-border)",
  borderB: "var(--sm-borderB)",
  blue:    "var(--sm-blue)",
  blueL:   "var(--sm-blueL)",
  blueD:   "var(--sm-blueD)",
  white:   "var(--sm-white)",
  yellow:  "var(--sm-yellow)",
  green:   "var(--sm-green)",
  red:     "var(--sm-red)",
  cyan:    "var(--sm-cyan)",
  gray1:   "var(--sm-gray1)",
  gray2:   "var(--sm-gray2)",
  gray3:   "var(--sm-gray3)",
  gray4:   "var(--sm-gray4)",
  blueTint:   "var(--sm-blue-tint)",
  cyanTint:   "var(--sm-cyan-tint)",
  greenTint:  "var(--sm-green-tint)",
  redTint:    "var(--sm-red-tint)",
  yellowTint: "var(--sm-yellow-tint)",
};

// Qualitative chart palette (pie/bar segments, per-holding series colors).
// Deliberately muted/pastel — enough hue separation to tell 10 segments
// apart at a glance, without the pure-primary neon (#00FF00/#FFFF00/
// #00FF00/#FF00FF-style) this used before, which glows against the dark
// panels and fights with the semantic green/red gain-loss colors elsewhere.
const SERIES_COLS = ["#7C9CE8","#7FC79A","#E3C574","#7ECFD4","#E58A8A","#B79AE0","#E5A97C","#9DC3EA","#A8DDB0","#A3ADBB"];
export const PIE_COLS    = SERIES_COLS;

export const fmt    = (n,d=2) => n==null||isNaN(n) ? "N/A" : (+n).toFixed(d);
export const fmtM   = (n) => {
  if (n==null) return "N/A";
  if (n>=1e12) return `${(n/1e12).toFixed(2)}T`;
  if (n>=1e9)  return `${(n/1e9).toFixed(2)}B`;
  if (n>=1e6)  return `${(n/1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
};
export const pCol   = (v) => v>0 ? B.green : v<0 ? B.red : B.gray2;
export const pSign  = (v) => v==null ? "N/A" : v>0 ? `+${v}` : `${v}`;
export const groupBy = (arr, key, total) => {
  const m={};
  arr.forEach(h=>{ const k=h.asset[key]||"OTHER"; m[k]=(m[k]||0)+h.value; });
  return Object.entries(m).map(([name,value])=>({name,value,pct:+(value/total*100).toFixed(1)})).sort((a,b)=>b.value-a.value);
};

// Sector breakdown with ETF look-through: a stock/REIT (or any holding with
// no weighting data) contributes its full value to its one `asset.sector`,
// same as groupBy above — but a fund with real sector-weighting data
// (asset.sectorWeights, fetched from Yahoo's topHoldings module for ETFs)
// instead splits its value fractionally across every sector it actually
// holds, so e.g. a broad-market ETF shows up as Technology/Financials/
// Healthcare/etc. in proportion, rather than one opaque "Other" bucket.
// Weights are already fractions of the fund's total value (not just its
// equity sleeve), so no fund's own bond/cash slice is double-counted —
// it's simply left unattributed to any sector, same as it would be if
// that slice were its own separate BOND/CASH holding.
export const groupBySectorLookThrough = (holdings, total) => {
  const m = {};
  holdings.forEach(h => {
    const weights = h.asset.sectorWeights;
    if (weights && Object.keys(weights).length) {
      Object.entries(weights).forEach(([sector, w]) => {
        m[sector] = (m[sector]||0) + h.value * w;
      });
    } else {
      const k = h.asset.sector || "OTHER";
      m[k] = (m[k]||0) + h.value;
    }
  });
  return Object.entries(m).map(([name,value])=>({name,value,pct:+(value/total*100).toFixed(1)})).sort((a,b)=>b.value-a.value);
};

// Single-stock exposure with ETF look-through — same idea as
// groupBySectorLookThrough above, but keyed by underlying ticker instead
// of sector: a large ETF position isn't itself "single name risk", since
// underneath it's a basket of stocks — what matters is how concentrated
// YOUR effective exposure to any one company is once you add up direct
// stock holdings AND each fund's slice of that same company. A holding
// with real constituent-weighting data (asset.holdingWeights, fetched
// from Yahoo's topHoldings module) splits its value fractionally across
// the underlying tickers it actually holds; a plain stock/REIT (or a fund
// Yahoo has no holdings breakdown for) contributes its full value to its
// own ticker, same as before. Note Yahoo only ever returns a fund's top
// ~10 constituents, so this can under-count — never over-count — a
// stock's true exposure through funds outside their top 10.
export const computeSingleNameExposure = (holdings, total) => {
  const m = {};
  holdings.forEach(h => {
    const weights = h.asset.holdingWeights;
    if (weights && Object.keys(weights).length) {
      Object.entries(weights).forEach(([ticker, w]) => {
        m[ticker] = (m[ticker]||0) + h.value * w;
      });
    } else {
      const k = h.asset.ticker || h.asset.symbol || "OTHER";
      m[k] = (m[k]||0) + h.value;
    }
  });
  return Object.entries(m).map(([ticker,value])=>({ticker,value,pct:+(value/total*100).toFixed(1)})).sort((a,b)=>b.value-a.value);
};

// "Overlap Checker" / True Exposure — flags any underlying name that shows
// up in more than one of the portfolio's own instruments (held directly
// and/or inside one or more funds' look-through holdings), regardless of
// what kind of instrument each source is (ETF, stock, fund, ...). A name
// coming from only a single source — direct-only, or inside exactly one
// fund — is not an overlap and is left out entirely.
//
// Honesty constraints (do not weaken these without re-reading the spec
// this was built against):
//   - A fund only ever contributes to `unavailableFundTickers` when it's
//     categorized ETF and has NO holdingWeights at all — that's Yahoo's
//     topHoldings module returning nothing for it (fetch failure or no
//     data), and the caller must surface that as "data unavailable",
//     never silently treat it as "0% overlap".
//   - Every fund that DOES have holdingWeights only ever reflects Yahoo's
//     top ~10 constituents — a name absent from a fund's holdingWeights
//     is NOT proof that fund doesn't hold it, just that it isn't in the
//     visible top 10. The caller must caveat this globally, not claim a
//     verified zero for any absent name.
export const computeOverlapExposure = (holdings, total) => {
  const directByTicker = new Map();
  const indirectByTicker = new Map(); // ticker -> Map(fundTicker -> value)
  const unavailableFundTickers = [];

  holdings.forEach(h => {
    const ticker = h.asset.ticker || h.asset.symbol || "OTHER";
    const isFund = h.asset.category === "ETF";
    const weights = h.asset.holdingWeights;
    if (isFund) {
      if (weights && Object.keys(weights).length) {
        Object.entries(weights).forEach(([underlying, w]) => {
          if (!indirectByTicker.has(underlying)) indirectByTicker.set(underlying, new Map());
          const perFund = indirectByTicker.get(underlying);
          perFund.set(ticker, (perFund.get(ticker) || 0) + h.value * w);
        });
      } else {
        unavailableFundTickers.push(ticker);
      }
    } else {
      directByTicker.set(ticker, (directByTicker.get(ticker) || 0) + h.value);
    }
  });

  const allTickers = new Set([...directByTicker.keys(), ...indirectByTicker.keys()]);
  const rows = Array.from(allTickers).map(ticker => {
    const directValue = directByTicker.get(ticker) || 0;
    const perFund = indirectByTicker.get(ticker);
    const viaFunds = perFund
      ? Array.from(perFund.entries())
          .map(([fundTicker, value]) => ({ fundTicker, value, pct: total > 0 ? value / total * 100 : 0 }))
          .sort((a, b) => b.value - a.value)
      : [];
    // Every place this name comes from, direct holding included — this is
    // what "overlap" actually means: the same name reachable through more
    // than one of your own instruments.
    const sources = [
      ...(directValue > 0 ? [{ label: "Direct", value: directValue, pct: total > 0 ? directValue / total * 100 : 0 }] : []),
      ...viaFunds.map(f => ({ label: f.fundTicker, value: f.value, pct: f.pct })),
    ].sort((a, b) => b.value - a.value);
    const totalValue = directValue + viaFunds.reduce((s, f) => s + f.value, 0);
    return {
      ticker,
      sources,
      totalValue, totalPct: total > 0 ? totalValue / total * 100 : 0,
    };
  })
    .filter(r => r.sources.length >= 2) // held through only one source isn't an overlap
    .sort((a, b) => b.totalValue - a.totalValue);

  return { rows, unavailableFundTickers: Array.from(new Set(unavailableFundTickers)) };
};

export const pMet = (hs) => {
  if (!hs.length) return null;
  const total = hs.reduce((s,h)=>s+h.value,0);
  const wRet  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.er??0),0);
  const wVol  = Math.sqrt(hs.reduce((s,h)=>s+Math.pow((h.value/total)*(h.asset.vol??15),2),0));
  const wBeta = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.beta??1),0);
  const wDiv  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.dy??0),0);
  const wDay  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.dayChangePct??0),0);
  const sharpe= wVol>0 ? (wRet-2.5)/wVol : 0;
  const sectors = new Set(hs.map(h=>h.asset.sector||"OTHER")).size;
  const geos    = new Set(hs.map(h=>h.asset.geo||"OTHER")).size;
  const hhi     = hs.reduce((s,h)=>s+Math.pow(h.value/total*100,2),0);
  return {total,wRet,wVol,wBeta,wDiv,wDay,sharpe,sectors,geos,hhi};
};

export const FKey = ({num,label,active,onClick}) => (
  <button onClick={onClick} style={{
    background:active?B.blue:B.panel2, border:`1px solid ${active?B.blue:B.borderB}`,
    borderRadius:0, padding:"5px 10px", cursor:"pointer",
    display:"flex", alignItems:"center", gap:4,
    fontFamily:"'Courier New',Courier,monospace", flexShrink:0,
  }}>
    {num&&<span style={{fontSize:12,color:active?B.white:B.gray2,fontWeight:700}}>{num}</span>}
    <span style={{fontSize:13,color:active?B.white:B.gray2,fontWeight:700,
      letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
  </button>
);

export const BPanel = ({title,children,style,accent}:any) => (
  <div style={{border:`1px solid ${accent?B.blue:B.border}`,background:B.panel,borderRadius:12,...style}}>
    {title&&(
      <div style={{padding:"14px 16px 0"}}>
        <span style={{fontSize:14,fontWeight:700,color:accent?B.blue:B.gray2,
          fontFamily:"'Courier New',monospace",letterSpacing:"0.06em",textTransform:"uppercase"}}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

// ── Auth gating — one reusable pattern instead of hand-rolling the same
// "if (!user) ..." check at every gated tab/button across the Terminal.
// Two shapes, since the two kinds of gate need different UI:
//   - RequireAuth: swaps a whole tab/page's content for a centered
//     "Sign in to X" message. `children` is a thunk (not a plain node) so
//     the real content — and anything it'd otherwise compute/fetch — is
//     never even evaluated for a signed-out visitor.
//   - useAuthGuard: for one-off actions (a SAVE/Export/Watchlist button)
//     that stay visible either way — clicking them anonymously pops a
//     small modal instead of silently doing nothing or hard-navigating
//     away from whatever the user was doing.
// Same copy pattern in both ("Sign in to <reason>") and the same Link
// target, so the prompt reads as one consistent system everywhere.
export function SignInPrompt({ reason, style }: { reason: string; style?: any }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:14, padding:"70px 24px", textAlign:"center", flex:1, ...style,
    }}>
      <div style={{fontSize:15,color:B.gray2,fontFamily:"'Courier New',monospace",maxWidth:340,lineHeight:1.6}}>
        Sign in to {reason}
      </div>
      <Link to="/auth" style={{
        background:B.blue, color:B.white, padding:"10px 22px", borderRadius:6,
        textDecoration:"none", fontFamily:"'Courier New',monospace", fontWeight:700,
        fontSize:13, letterSpacing:"0.04em",
      }}>
        SIGN IN
      </Link>
    </div>
  );
}

export function RequireAuth({ user, reason, children }: { user: any; reason: string; children: () => React.ReactNode }) {
  return user ? <>{children()}</> : <SignInPrompt reason={reason} />;
}

function AuthGateModal({ reason, onClose }: { reason: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:300,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        background:B.panel, border:`1px solid ${B.borderB}`, borderRadius:12,
        padding:"28px 24px", maxWidth:320, textAlign:"center",
        display:"flex", flexDirection:"column", gap:16,
      }}>
        <div style={{fontSize:15,color:B.gray1,fontFamily:"'Courier New',monospace",lineHeight:1.6}}>
          Sign in to {reason}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <Link to="/auth" style={{
            background:B.blue, color:B.white, padding:"9px 18px", borderRadius:6,
            textDecoration:"none", fontFamily:"'Courier New',monospace", fontWeight:700, fontSize:13,
          }}>Sign In</Link>
          <button onClick={onClose} style={{
            background:"transparent", border:`1px solid ${B.borderB}`, color:B.gray2,
            borderRadius:6, padding:"9px 18px", cursor:"pointer",
            fontFamily:"'Courier New',monospace", fontSize:13, fontWeight:700,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// `guard("save your portfolio", saveFn)` — runs saveFn() if signed in,
// otherwise pops the modal with that exact reason. `modal` is null when
// there's nothing to show; render it once anywhere in the page.
export function useAuthGuard(user: any) {
  const [reason, setReason] = useState<string | null>(null);
  const guard = (actionReason: string, fn: () => void) => {
    if (!user) { setReason(actionReason); return; }
    fn();
  };
  const modal = reason ? <AuthGateModal reason={reason} onClose={() => setReason(null)} /> : null;
  return { guard, modal };
}

// Educational risk score (0-100), our own scoring method — not an external
// credit or risk rating, not a validated quantitative model. Shared here
// (not left inline in AnalysisPage) so every consumer — the portfolio's
// own score, its What-If "after" counterpart, and the community risk-score
// percentile comparison, which recomputes this from every shared
// portfolio_snapshot — is guaranteed to use the exact identical formula,
// never a separately-drifting copy. Four factors, each floored at 0 so
// being "better than baseline" never subtracts points: concentration
// (HHI), sector concentration (look-through), volatility above a 15%
// baseline, and beta above 1.
export function computeRiskScore(hhi: number, topSectorPct: number, wVol: number, wBeta: number): number {
  return Math.round(Math.min(100,
    Math.max(0, (hhi - 1500) / 100) +
    Math.max(0, topSectorPct - 20) * 0.5 +
    Math.max(0, wVol - 15) * 0.8 +
    Math.max(0, (wBeta - 1) * 15)
  ));
}

// Raw holdings.length treats "2 ETFs" the same as "2 single stocks", which
// understates real diversification: a broad-market ETF is itself a basket
// of many names, even when we only have (or have none of) its top-10
// look-through breakdown. Each ETF position counts toward an "effective"
// position count as if it were several distinct names, instead of
// penalizing the portfolio for holding funds rather than a long list of
// individual stocks. This is a floor, not a verified count — real funds
// typically hold far more.
export const ETF_EFFECTIVE_POSITIONS = 15;
export function computeEffectivePositions(holdings: any[]): number {
  return holdings.reduce((n: number, h: any) =>
    n + (h.asset.category === "ETF" ? ETF_EFFECTIVE_POSITIONS : 1), 0);
}

export function computeAlerts(holdings:any[], m:any) {
  const alerts: {sev:"HIGH"|"MED"|"LOW"|"OK", title:string, detail:string, metric:string}[] = [];
  if (!holdings.length) return alerts;

  // 1. Single-name concentration, with ETF look-through (see
  // computeSingleNameExposure): a large ETF position isn't itself
  // single-name risk — it's a basket of stocks — so this looks through
  // each fund's own constituent weights and adds them to any direct stock
  // holdings of the same company before flagging the largest true
  // single-company exposure.
  const topSingleName = computeSingleNameExposure(holdings, m.total)[0];
  const maxWeight = topSingleName?.pct ?? 0;
  if (maxWeight > 40) alerts.push({sev:"HIGH", title:"SINGLE-NAME CONCENTRATION", metric:`${maxWeight.toFixed(1)}%`,
    detail:`${topSingleName?.ticker} exceeds 40% of portfolio. Consider diversifying — a single-name loss could severely impact total return.`});
  else if (maxWeight > 25) alerts.push({sev:"MED", title:"SINGLE-NAME EXPOSURE", metric:`${maxWeight.toFixed(1)}%`,
    detail:`${topSingleName?.ticker} represents >25% of portfolio. Moderate concentration risk.`});

  // 2. Sector concentration — look-through (see groupBySectorLookThrough):
  // stocks/REITs contribute their one sector directly; ETFs with real
  // sector-weighting data split fractionally across every sector they
  // actually hold, instead of being excluded wholesale as before. Bonds,
  // commodities, crypto, FX and cash aren't a "sector" concept at all, so
  // they stay excluded regardless.
  const sectorEligible = holdings.filter((h:any) => !["BOND","COMMODITY","CRYPTO","FX","CASH"].includes(h.asset.category));
  const secArr = groupBySectorLookThrough(sectorEligible, m.total).map((s:any) => ({k: s.name, pct: s.pct}));
  const topSector = secArr[0];
  if (topSector && topSector.pct > 50) alerts.push({sev:"HIGH", title:"SECTOR CONCENTRATION", metric:`${topSector.pct.toFixed(1)}%`,
    detail:`Over half of portfolio is in ${topSector.k}. Sector-specific shocks would drive most of the loss.`});
  else if (topSector && topSector.pct > 35) alerts.push({sev:"MED", title:"SECTOR EXPOSURE", metric:`${topSector.pct.toFixed(1)}%`,
    detail:`${topSector.k} is >35% of portfolio. Consider spreading across additional sectors.`});

  // 3. Geographic concentration — "WORLD" is excluded from the flagged
  // total on purpose: it means a holding is already spread across many
  // regions (e.g. a global/all-world index fund), which is the opposite
  // of geographic concentration, not a single-region bet. Flagging 100%
  // "WORLD" as concentrated risk was actively wrong, not just noisy.
  const geoMap = new Map<string,number>();
  holdings.forEach((h:any) => {
    const g = h.asset.geo || "US";
    geoMap.set(g, (geoMap.get(g)||0) + h.value);
  });
  const geoArr = Array.from(geoMap.entries())
    .filter(([k]) => k !== "WORLD")
    .map(([k,v]) => ({k, pct: v/m.total*100})).sort((a,b)=>b.pct-a.pct);
  const topGeo = geoArr[0];
  if (topGeo && topGeo.pct > 80) alerts.push({sev:"MED", title:"GEOGRAPHIC EXPOSURE", metric:`${topGeo.pct.toFixed(1)}%`,
    detail:`${topGeo.k} accounts for most of the book (excluding globally-diversified "WORLD" holdings). Currency/political risk elevated.`});

  // 4. Volatility
  if (m.wVol > 30) alerts.push({sev:"HIGH", title:"HIGH VOLATILITY", metric:`${m.wVol.toFixed(1)}%`,
    detail:`Portfolio volatility exceeds 30% — expect large swings. Educational scenarios show ±30% is typical annual range.`});
  else if (m.wVol > 20) alerts.push({sev:"MED", title:"ELEVATED VOLATILITY", metric:`${m.wVol.toFixed(1)}%`,
    detail:`Volatility >20%. Compare against your risk tolerance and horizon.`});

  // 5. Sharpe (risk-adjusted return)
  if (m.sharpe < 0.2) alerts.push({sev:"MED", title:"LOW RISK-ADJUSTED RETURN", metric:m.sharpe.toFixed(2),
    detail:`Sharpe <0.2. Historically, portfolios with Sharpe <0.5 have delivered poor return per unit of risk.`});

  // 6. Beta (systematic risk)
  if (m.wBeta > 1.3) alerts.push({sev:"MED", title:"HIGH MARKET BETA", metric:m.wBeta.toFixed(2),
    detail:`Beta >1.3 → portfolio moves 30%+ more than market on average. Amplifies both gains and losses.`});
  else if (m.wBeta < 0.5 && holdings.length > 2) alerts.push({sev:"LOW", title:"LOW BETA / DEFENSIVE", metric:m.wBeta.toFixed(2),
    detail:`Beta <0.5. Portfolio may lag in bull markets but is more resilient in downturns.`});

  // 7. HHI concentration index
  if (m.hhi > 3000) alerts.push({sev:"HIGH", title:"HHI CONCENTRATION", metric:m.hhi.toFixed(0),
    detail:`HHI >3000. In antitrust terms, this level indicates a highly concentrated portfolio.`});
  else if (m.hhi > 1800) alerts.push({sev:"MED", title:"HHI MODERATE CONCENTRATION", metric:m.hhi.toFixed(0),
    detail:`HHI 1800-3000 signals moderate concentration.`});

  // 8. Under-diversification — see computeEffectivePositions above.
  const effectivePositions = computeEffectivePositions(holdings);
  if (effectivePositions < 5) alerts.push({sev:"MED", title:"UNDER-DIVERSIFIED", metric:`${holdings.length} names`,
    detail:`Fewer than 5 effective positions (ETFs count as multiple, since each is a basket of holdings). Academic literature suggests ~15-20 uncorrelated names for effective diversification.`});
  else if (effectivePositions < 10) alerts.push({sev:"LOW", title:"LIMITED DIVERSIFICATION", metric:`${holdings.length} names`,
    detail:`Still relatively concentrated even after counting each ETF as a basket of holdings. Adding uncorrelated assets could improve diversification.`});

  // 9. All green — nothing to warn
  if (alerts.length === 0) alerts.push({sev:"OK", title:"NO SIGNIFICANT ALERTS", metric:"✓",
    detail:`No exposure thresholds breached at educational limits. Continue monitoring as positions evolve.`});

  return alerts;
}

// Plain-text portfolio snapshot fed to the AI as context — shared by the AI
// advisor chat and the home-page daily summary card.
export function buildPortfolioContext(holdings:any[]) {
  if (!holdings.length) return "NO PORTFOLIO LOADED.";
  const m = pMet(holdings)!;
  return [
    `LIVE PORTFOLIO SNAPSHOT (${holdings.length} SECURITIES — LIVE MARKET DATA):`,
    `MKT VALUE: $${fmtM(m.total)} | EXP RET: ${fmt(m.wRet,2)}% | VOL: ${fmt(m.wVol,2)}% | SHARPE: ${fmt(m.sharpe,2)} | BETA: ${fmt(m.wBeta,2)} | DIV YIELD: ${fmt(m.wDiv,2)}%`,
    `SECTORS: ${m.sectors} | GEO REGIONS: ${m.geos} | HHI: ${fmt(m.hhi,0)}`,
    "POSITIONS: "+holdings.map((h:any)=>`${h.asset.ticker}(WT:${(h.value/m.total*100).toFixed(0)}%,VOL:${h.asset.vol??'N/A'}%,BETA:${h.asset.beta??'N/A'},YTD:${h.asset.ytd??'N/A'}%,1D:${h.asset.dayChangePct??'N/A'}%,SECT:${h.asset.sector||'N/A'})`).join(" | "),
  ].join("\n");
}

// Compound annual growth rate between two values `days` apart.
export function computeCagr(startValue: number, endValue: number, days: number) {
  if (!(startValue > 0)) return 0;
  const years = Math.max(days / 365, 1 / 365);
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

// Severity badge styling — reuses the shared --sm-* accent tokens (and
// their pre-tinted dark backgrounds) instead of its own hardcoded neon
// hexes (#FF3333/#00FFFF/#00FF66/etc, previously), so it stays in sync
// with any future palette retint instead of drifting back to neon.
export const SEV_STYLE:any = {
  HIGH: { border: "var(--sm-red)",    bg: "var(--sm-red-tint)",    text: "var(--sm-red)",    icon: "⚠", label: "HIGH RISK" },
  MED:  { border: "var(--sm-yellow)", bg: "var(--sm-yellow-tint)", text: "var(--sm-yellow)", icon: "◆", label: "MEDIUM" },
  LOW:  { border: "var(--sm-cyan)",   bg: "var(--sm-cyan-tint)",   text: "var(--sm-cyan)",   icon: "ℹ", label: "INFO" },
  OK:   { border: "var(--sm-green)",  bg: "var(--sm-green-tint)",  text: "var(--sm-green)",  icon: "✓", label: "OK" },
};
