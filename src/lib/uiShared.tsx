// Shared UI helpers used by PortfolioTerminal, HomePage, and AnalysisPage.
// Kept in its own file (no imports from those three) to avoid circular imports.

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
};

const SERIES_COLS = ["#0066FF","#00FF00","#FFFF00","#00FFFF","#FF3333","#FF00FF","#FF8800","#AAAAAA","#66CCFF","#88FF88"];
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
    background:active?B.blue:B.panel2, border:`1px solid ${active?B.blue:B.border}`,
    borderRadius:0, padding:"5px 10px", cursor:"pointer",
    display:"flex", alignItems:"center", gap:4,
    fontFamily:"'Courier New',Courier,monospace", flexShrink:0,
  }}>
    {num&&<span style={{fontSize:11,color:active?B.white:B.gray3,fontWeight:700}}>{num}</span>}
    <span style={{fontSize:12,color:active?B.white:B.gray2,fontWeight:700,
      letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
  </button>
);

export const BPanel = ({title,children,style,accent}:any) => (
  <div style={{border:`1px solid ${accent?B.blue:B.border}`,background:B.panel,borderRadius:12,...style}}>
    {title&&(
      <div style={{padding:"14px 16px 0"}}>
        <span style={{fontSize:13,fontWeight:700,color:B.blue,
          fontFamily:"'Courier New',monospace",letterSpacing:"0.06em",textTransform:"uppercase"}}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

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

  // 3. Geographic concentration
  const geoMap = new Map<string,number>();
  holdings.forEach((h:any) => {
    const g = h.asset.geo || "US";
    geoMap.set(g, (geoMap.get(g)||0) + h.value);
  });
  const geoArr = Array.from(geoMap.entries()).map(([k,v]) => ({k, pct: v/m.total*100})).sort((a,b)=>b.pct-a.pct);
  const topGeo = geoArr[0];
  if (topGeo && topGeo.pct > 80) alerts.push({sev:"MED", title:"GEOGRAPHIC EXPOSURE", metric:`${topGeo.pct.toFixed(1)}%`,
    detail:`${topGeo.k} accounts for most of the book. Currency/political risk elevated.`});

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

  // 8. Under-diversification
  if (holdings.length < 5) alerts.push({sev:"MED", title:"UNDER-DIVERSIFIED", metric:`${holdings.length} names`,
    detail:`Fewer than 5 positions. Academic literature suggests ~15-20 uncorrelated names for effective diversification.`});
  else if (holdings.length < 10) alerts.push({sev:"LOW", title:"LIMITED DIVERSIFICATION", metric:`${holdings.length} names`,
    detail:`5-9 positions. Adding uncorrelated assets could improve diversification.`});

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

export const SEV_STYLE:any = {
  HIGH: { border: "#FF3333", bg: "rgba(255,51,51,0.08)", text: "#FF3333", icon: "⚠", label: "HIGH RISK" },
  MED:  { border: "#FFA500", bg: "rgba(255,165,0,0.08)", text: "#FFA500", icon: "◆", label: "MEDIUM" },
  LOW:  { border: "#00FFFF", bg: "rgba(0,255,255,0.06)", text: "#00FFFF", icon: "ℹ", label: "INFO" },
  OK:   { border: "#00FF66", bg: "rgba(0,255,102,0.06)", text: "#00FF66", icon: "✓", label: "OK" },
};
