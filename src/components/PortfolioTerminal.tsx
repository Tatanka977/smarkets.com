// @ts-nocheck
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  searchSecurities as srvSearch,
  fetchQuote as srvQuote,
  batchRefresh as srvBatch,
  fetchMarketStatus as srvMarketStatus,
  fetchHistoricalPrice as srvHistorical,
} from "@/lib/finance.functions";
import { aiChat } from "@/lib/ai.functions";
import {
  fetchMarketNews as srvMarketNews,
  fetchCompanyNews as srvCompanyNews,
} from "@/lib/news.functions";
import {
  savePortfolio,
  saveConversation,
  addToWatchlist as srvAddWatch,
} from "@/lib/profile.functions";
import { useUser } from "@/hooks/useUser";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useTheme } from "@/hooks/useTheme";
import { Link } from "@tanstack/react-router";

const B = {
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
const PIE_COLS    = SERIES_COLS;

const fmt    = (n,d=2) => n==null||isNaN(n) ? "N/A" : (+n).toFixed(d);
const fmtM   = (n) => {
  if (n==null) return "N/A";
  if (n>=1e12) return `${(n/1e12).toFixed(2)}T`;
  if (n>=1e9)  return `${(n/1e9).toFixed(2)}B`;
  if (n>=1e6)  return `${(n/1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
};
const pCol   = (v) => v>0 ? B.green : v<0 ? B.red : B.gray2;
const pSign  = (v) => v==null ? "N/A" : v>0 ? `+${v}` : `${v}`;
const groupBy = (arr, key, total) => {
  const m={};
  arr.forEach(h=>{ const k=h.asset[key]||"N/A"; m[k]=(m[k]||0)+h.value; });
  return Object.entries(m).map(([name,value])=>({name,value,pct:+(value/total*100).toFixed(1)})).sort((a,b)=>b.value-a.value);
};
const pMet = (hs) => {
  if (!hs.length) return null;
  const total = hs.reduce((s,h)=>s+h.value,0);
  const wRet  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.er??0),0);
  const wVol  = Math.sqrt(hs.reduce((s,h)=>s+Math.pow((h.value/total)*(h.asset.vol??15),2),0));
  const wBeta = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.beta??1),0);
  const wDiv  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.dy??0),0);
  const wDay  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.dayChangePct??0),0);
  const sharpe= wVol>0 ? (wRet-2.5)/wVol : 0;
  const sectors = new Set(hs.map(h=>h.asset.sector||"N/A")).size;
  const geos    = new Set(hs.map(h=>h.asset.geo||"N/A")).size;
  const hhi     = hs.reduce((s,h)=>s+Math.pow(h.value/total*100,2),0);
  return {total,wRet,wVol,wBeta,wDiv,wDay,sharpe,sectors,geos,hhi};
};

const searchSecurities = (q, category) => srvSearch({ data: { q, category } });
const fetchQuote = (sym) => srvQuote({ data: { symbol: sym } });
const batchRefresh = (symbols) => srvBatch({ data: { symbols } });
const fetchMarketStatus = (exchanges?:string[]) => srvMarketStatus({ data: { exchanges } });
const fetchHistoricalPrice = (symbol, date) => srvHistorical({ data: { symbol, date } });
const fetchMarketNews = (category) => srvMarketNews({ data: { category } });
const fetchCompanyNews = (symbol, days=14) => srvCompanyNews({ data: { symbol, days } });

const CATEGORY_TABS = [
  { id: undefined, label: "ALL" },
  { id: "STOCK", label: "STOCKS" },
  { id: "ETF", label: "ETF" },
  { id: "BOND", label: "BONDS" },
  { id: "COMMODITY", label: "COMM." },
  { id: "CRYPTO", label: "CRYPTO" },
  { id: "REIT", label: "REIT" },
  { id: "FX", label: "FX" },
];

const FKey = ({num,label,active,onClick}) => (
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

const BPanel = ({title,children,style,accent}:any) => (
  <div style={{border:`1px solid ${accent?B.blue:B.border}`,background:B.panel,...style}}>
    {title&&(
      <div style={{background:accent?B.blue:B.blue,padding:"3px 8px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:B.white,
          fontFamily:"'Courier New',monospace",letterSpacing:"0.08em",textTransform:"uppercase"}}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

const Spinner = ({text}:any) => (
  <div style={{padding:"12px 8px",textAlign:"center"}}>
    <div style={{fontSize:15,color:B.blue,fontFamily:"'Courier New',monospace",
      animation:"blink 1s infinite"}}>{text||"LOADING..."}</div>
  </div>
);

const ErrMsg = ({msg}:any) => (
  <div style={{padding:"6px 8px",fontSize:15,color:B.red,fontFamily:"'Courier New',monospace",
    background:"#1a0000",border:`1px solid ${B.red}`}}>
    ⚠ {msg}
  </div>
);

const TT_STYLE = {background:"#111",border:`1px solid ${B.blue}`,borderRadius:0,
  fontSize:15,color:B.yellow,fontFamily:"'Courier New',monospace",padding:"4px 8px"};

const PW=393, PH=852;

function PhoneShell({children}:any) {
  const [time,setTime]=useState("");
  useEffect(()=>{
    const upd=()=>setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false}));
    upd();
    const t=setInterval(upd,10000);
    return()=>clearInterval(t);
  },[]);
  return (
    <div className="sm-shell" style={{background:B.bg,minHeight:"100vh",display:"flex",flexDirection:"column",
      fontFamily:"'Courier New',Courier,monospace"}}>
      {children(time)}
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        html, body, #root { background:${B.bg}; margin:0; padding:0; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; background:#000; }
        ::-webkit-scrollbar-thumb { background:${B.blue}; }

        /* ── Responsive shell ──────────────────────────────────────────── */
        .sm-shell { width:100%; margin:0 auto; }
        @media (min-width: 768px)  { .sm-shell { max-width: 820px;  border-left:1px solid ${B.border}; border-right:1px solid ${B.border}; } }
        @media (min-width: 1200px) { .sm-shell { max-width: 980px; } }
        @media (min-width: 1600px) { .sm-shell { max-width: 1080px; } }

        /* ── Global responsive font-size overrides ─────────────────────
           The app was originally sized for a mid-size phone. Below we
           dial the largest inline sizes down on small screens to prevent
           overlap on narrow viewports (≤480 px).                        */
        @media (max-width: 480px) {
          .sm-shell [style*="font-size: 32"] { font-size: 20px !important; }
          .sm-shell [style*="font-size: 28"] { font-size: 18px !important; }
          .sm-shell [style*="font-size: 26"] { font-size: 17px !important; }
          .sm-shell [style*="font-size: 24"] { font-size: 16px !important; }
          .sm-shell [style*="font-size: 22"] { font-size: 15px !important; }
          .sm-shell [style*="font-size: 20"] { font-size: 14px !important; }
          .sm-shell [style*="font-size: 18"] { font-size: 13px !important; }
          .sm-shell [style*="font-size: 16"] { font-size: 12px !important; }
          .sm-shell [style*="font-size: 15"] { font-size: 12px !important; }
          .sm-shell [style*="font-size: 14"] { font-size: 11px !important; }
          .sm-shell [style*="font-size: 13"] { font-size: 11px !important; }
          .sm-shell [style*="font-size: 12"] { font-size: 10px !important; }
          .sm-shell [style*="font-size: 11"] { font-size: 10px !important; }
        }
        /* Slightly bigger on desktop for readability */
        @media (min-width: 1400px) {
          .sm-shell [style*="font-size: 32"] { font-size: 36px !important; }
          .sm-shell [style*="font-size: 24"] { font-size: 22px !important; }
        }

        /* Allow the horizontal top nav to scroll on very narrow screens */
        .sm-topbar { flex-wrap: wrap; gap: 6px; }
        .sm-fkeys, .sm-bottomnav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .sm-fkeys::-webkit-scrollbar, .sm-bottomnav::-webkit-scrollbar { height: 0; }

        /* Hide secondary tagline on very narrow screens to avoid overlap */
        @media (max-width: 480px) {
          .sm-tagline { display: none !important; }
          .sm-topbar { padding: 6px 8px !important; }
        }

        ::selection { background: ${B.blue}; color: ${B.white}; }
      `}</style>
    </div>
  );
}

function TopBar({time}:any) {
  const { user } = useUser();
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  return (
    <div className="sm-topbar" style={{background:B.blue,display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"6px 12px",flexShrink:0,gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,minWidth:0}}>
        <span style={{fontSize:16,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",
          letterSpacing:"0.14em",whiteSpace:"nowrap"}}>STRATEGIC MARKETS</span>
        <span className="sm-tagline" style={{fontSize:12,color:"rgba(255,255,255,0.75)",
          fontFamily:"'Courier New',monospace",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>
          PORTFOLIO TERMINAL
        </span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:B.yellow,fontFamily:"'Courier New',monospace",
          fontWeight:700,letterSpacing:"0.06em"}}>● LIVE</span>
        <span style={{fontSize:12,color:B.white,fontFamily:"'Courier New',monospace",opacity:0.85}}>{time}</span>
        <button
          data-testid="theme-toggle-button"
          onClick={toggleTheme}
          title={isAurora ? "Switch to Terminal theme" : "Switch to Aurora theme"}
          aria-label="Toggle theme"
          style={{
            fontSize:11,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",
            background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.4)",
            padding:"3px 8px",letterSpacing:"0.08em",cursor:"pointer",
            display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
          }}
        >
          <span style={{
            display:"inline-block",width:22,height:12,borderRadius:12,
            background:isAurora?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.25)",
            position:"relative",transition:"background 0.2s",
          }}>
            <span style={{
              position:"absolute",top:1,left:isAurora?11:1,width:10,height:10,borderRadius:"50%",
              background:isAurora?B.blue:B.white,transition:"left 0.2s",
            }}/>
          </span>
          <span>{isAurora ? "AURORA" : "TERMINAL"}</span>
        </button>
        <Link to={user ? "/profile" : "/auth"} style={{
          fontSize:12,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",
          textDecoration:"none",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.4)",
          padding:"4px 10px",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>
          {user ? "◉ PROFILE" : "▸ SIGN IN"}
        </Link>
      </div>
    </div>
  );
}

function FKeyBar({page,setPage}:any) {
  const keys=[
    {l:"HOME",    id:"home"},
    {l:"SEARCH",  id:"search"},
    {l:"PORT",    id:"portfolio"},
    {l:"ANALYSIS",id:"analysis"},
    {l:"AI ADVSR",id:"ai"},
    {l:"NEWS",    id:"news"},
  ];
  return (
    <div className="sm-fkeys" style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,
      display:"flex",alignItems:"stretch",padding:"4px 6px",gap:4,flexShrink:0}}>
      {keys.map(k=>(
        <FKey key={k.id} label={k.l} active={page===k.id} onClick={()=>setPage(k.id)}/>
      ))}
      <div style={{flex:1}}/>
      <span style={{fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",
        alignSelf:"center",paddingRight:4,letterSpacing:"0.06em"}}>HELP</span>
    </div>
  );
}

function BottomNav({page,setPage,badge}:any) {
  const tabs=[
    {id:"home",     label:"HOME"},
    {id:"search",   label:"SEARCH"},
    {id:"portfolio",label:"PORTFOLIO",badge},
    {id:"analysis", label:"ANALYSIS"},
    {id:"ai",       label:"AI"},
    {id:"news",     label:"NEWS"},
  ];
  return (
    <div className="sm-bottomnav" style={{background:B.panel2,borderTop:`1px solid ${B.borderB}`,
      display:"flex",paddingBottom:"env(safe-area-inset-bottom, 8px)",flexShrink:0}}>
      {tabs.map(t=>{
        const active=page===t.id;
        return (
          <button key={t.id} onClick={()=>setPage(t.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",
            padding:"8px 4px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            borderTop:`2px solid ${active?B.blue:"transparent"}`,position:"relative",minWidth:0}}>
            {t.badge>0&&<div style={{position:"absolute",top:2,right:"20%",
              background:B.blue,color:B.white,fontSize:10,fontWeight:700,
              fontFamily:"'Courier New',monospace",padding:"0 4px",lineHeight:"14px",borderRadius:2}}>{t.badge}</div>}
            <span style={{fontSize:11,color:active?B.blue:B.gray2,fontWeight:700,
              fontFamily:"'Courier New',monospace",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MarketStatusBar() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    fetchMarketStatus(["US", "L", "MI"]).then(d => {
      if (alive) { setStatuses(d || []); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const fmtLocal = (tz: string) => {
    try { return new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }); }
    catch { return "--:--"; }
  };

  return (
    <BPanel title="GLOBAL MARKET STATUS">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",
        gap:0, background:B.panel}}>
        {loading && (
          <div style={{padding:"8px 10px",color:B.gray3,fontSize:12,
            fontFamily:"'Courier New',monospace"}}>LOADING…</div>
        )}
        {statuses.map((s:any, i:number) => {
          const color = s.holiday ? B.yellow : s.isOpen ? B.green : B.red;
          return (
            <div key={s.code} style={{padding:"6px 10px",
              borderRight: i < statuses.length - 1 ? `1px solid ${B.border}` : "none",
              display:"flex",flexDirection:"column",gap:2,
              fontFamily:"'Courier New',monospace"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:8,height:8,background:color,borderRadius:"50%",
                  animation: s.isOpen ? "pulse 1.5s infinite" : "none",display:"inline-block"}}/>
                <span style={{fontSize:12,color:B.gray1,fontWeight:700,letterSpacing:"0.06em"}}>{s.label}</span>
              </div>
              <div style={{fontSize:11,color:color,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                {s.holiday ? "HOLIDAY" : s.isOpen ? (s.session === "regular" ? "OPEN" : s.session.toUpperCase()) : "CLOSED"}
              </div>
              <div style={{fontSize:11,color:B.gray3}}>{fmtLocal(s.timezone)} local</div>
            </div>
          );
        })}
      </div>
    </BPanel>
  );
}

function IndicesOverview() {
  const INDICES = [
    { sym: "SPY",  label: "S&P 500 ETF" },
    { sym: "QQQ",  label: "NASDAQ 100" },
    { sym: "DIA",  label: "DOW JONES" },
    { sym: "IWM",  label: "RUSSELL 2000" },
    { sym: "VIX",  label: "VOLATILITY" },
    { sym: "TLT",  label: "20YR TREASURY" },
  ];
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    batchRefresh(INDICES.map(i => i.sym))
      .then(list => {
        if (!alive) return;
        setQuotes(Object.fromEntries((list || []).map((q:any) => [q.symbol, q])));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BPanel title="KEY INDICES — SNAPSHOT" style={{marginTop:1}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:0}}>
        {INDICES.map((it, i) => {
          const q = quotes[it.sym];
          const price = q?.price;
          const chg = q?.dayChangePct;
          const chgCol = pCol(chg);
          return (
            <div key={it.sym} style={{padding:"6px 10px",
              borderRight: (i + 1) % 3 !== 0 ? `1px solid ${B.border}` : "none",
              borderBottom: i < 3 ? `1px solid ${B.border}` : "none",
              fontFamily:"'Courier New',monospace"}}>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:6}}>
                <span style={{fontSize:13,color:B.blue,fontWeight:700,letterSpacing:"0.04em"}}>{it.sym}</span>
                <span style={{fontSize:10,color:B.gray3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{it.label}</span>
              </div>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginTop:2}}>
                <span style={{fontSize:15,color:B.yellow,fontWeight:700}}>
                  {loading ? "…" : price != null ? price.toLocaleString(undefined,{maximumFractionDigits:2}) : "---"}
                </span>
                <span style={{fontSize:12,color:chgCol,fontWeight:700}}>
                  {chg != null ? `${pSign(fmt(chg, 2))}%` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </BPanel>
  );
}

function HomePage({holdings,setPage,onRefresh,refreshing}:any) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  const { user } = useUser();
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");
  const handleSave=async()=>{
    if(!user){ window.location.href="/auth"; return; }
    const name=prompt("Portfolio name:","Portfolio "+new Date().toLocaleDateString());
    if(!name) return;
    setSaving(true);
    try {
      await savePortfolio({ data: { name, holdings } });
      setSaveMsg("✓ SAVED");
    } catch(e:any){ setSaveMsg("ERROR: "+e.message); }
    finally { setSaving(false); setTimeout(()=>setSaveMsg(""),2000); }
  };


  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:4}}>
      <MarketStatusBar/>
      <IndicesOverview/>

      <div style={{marginTop:1}}>
      <BPanel title="PORTFOLIO OVERVIEW  LIVE DATA">
        <div style={{padding:"6px 8px"}}>
          {!m?(
            <div style={{padding:"12px 0",textAlign:"center"}}>
              <div style={{fontSize:13,color:B.gray2,fontFamily:"'Courier New',monospace",marginBottom:8}}>NO ACTIVE PORTFOLIO</div>
              <div style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:12}}>
                USE SEARCH TO FIND SECURITIES BY ISIN OR TICKER
              </div>
              <button onClick={()=>setPage("search")} style={{
                background:B.blue,border:"none",color:B.white,
                padding:"6px 20px",cursor:"pointer",
                fontFamily:"'Courier New',monospace",fontSize:17,fontWeight:700,letterSpacing:"0.08em"}}>
                {"> SEARCH SECURITIES"}
              </button>
            </div>
          ):(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
                <div style={{borderLeft:`3px solid ${B.blue}`,paddingLeft:6}}>
                  <div style={{fontSize:14,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>TOTAL MKT VALUE</div>
                  <div style={{fontSize:16,color:B.yellow,fontWeight:700,letterSpacing:"-0.02em"}}>${fmtM(m.total)}</div>
                </div>
                <div style={{borderLeft:`3px solid ${pCol(m.wRet)}`,paddingLeft:6}}>
                  <div style={{fontSize:14,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>PORT EXP RETURN</div>
                  <div style={{fontSize:16,color:pCol(m.wRet),fontWeight:700}}>{pSign(fmt(m.wRet,1))}%</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,
                borderTop:`1px solid ${B.border}`,paddingTop:4}}>
                {[
                  {l:"VOLATILITY",v:`${fmt(m.wVol,1)}%`,col:m.wVol>25?B.red:m.wVol>15?B.yellow:B.green},
                  {l:"SHARPE",    v:fmt(m.sharpe,2),    col:m.sharpe>0.7?B.green:m.sharpe>0.3?B.yellow:B.red},
                  {l:"BETA",      v:fmt(m.wBeta,2),     col:m.wBeta>1.3?B.red:B.white},
                  {l:"DIV YIELD", v:`${fmt(m.wDiv,1)}%`,col:B.cyan},
                ].map((k,i)=>(
                  <div key={i} style={{padding:"3px 4px",borderRight:i<3?`1px solid ${B.border}`:"none"}}>
                    <div style={{fontSize:16,color:B.gray3,textTransform:"uppercase",marginBottom:1}}>{k.l}</div>
                    <div style={{fontSize:16,color:k.col,fontWeight:700}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{borderTop:`1px solid ${B.border}`,marginTop:4,paddingTop:4,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace"}}>
                  {holdings.length} SECURITIES  ·  LIVE MARKET DATA
                </span>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={handleSave} disabled={saving||!holdings.length} style={{
                    background:"none",border:`1px solid ${B.green}`,color:B.green,
                    fontFamily:"'Courier New',monospace",fontSize:14,cursor:saving?"wait":"pointer",
                    padding:"2px 8px"}}>
                    {saving?"...":saveMsg||"💾 SAVE"}
                  </button>
                  <button onClick={onRefresh} disabled={refreshing} style={{
                    background:"none",border:`1px solid ${B.border}`,color:refreshing?B.gray3:B.blue,
                    fontFamily:"'Courier New',monospace",fontSize:14,cursor:refreshing?"not-allowed":"pointer",
                    padding:"2px 8px",animation:refreshing?"blink 0.5s infinite":"none"}}>
                    {refreshing?"UPDATING...":"↻ REFRESH"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </BPanel>

      {holdings.length>0&&(
        <BPanel title="SECURITIES — LIVE PRICES" style={{marginTop:1}}>
          {holdings.map(h=>(
            <div key={h.isin} style={{display:"flex",alignItems:"center",gap:8,
              padding:"4px 8px",borderBottom:`1px solid ${B.border}`,
              fontFamily:"'Courier New',monospace"}}>
              <span style={{fontSize:17,color:B.blue,fontWeight:700,minWidth:52}}>{h.asset.ticker}</span>
              <span style={{fontSize:17,color:B.yellow,minWidth:70}}>{h.asset.price!=null?h.asset.price.toLocaleString(undefined,{maximumFractionDigits:2}):"---"}</span>
              <span style={{fontSize:17,color:pCol(h.asset.dayChangePct),minWidth:50,fontWeight:700}}>
                {h.asset.dayChangePct!=null?`${pSign(fmt(h.asset.dayChangePct,2))}%`:"---"}
              </span>
              <span style={{fontSize:15,color:B.gray2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.asset.shortName||h.asset.ticker}</span>
            </div>
          ))}
        </BPanel>
      )}

      </div>
    </div>
  );
}

function SearchPage({onAdd,portfolio}:any) {
  const [q,setQ]         = usePersistentState<string>("search_q", "");
  const [results,setRes] = useState<any[]>([]);
  const [searching,setSrch]=useState(false);
  const [sel,setSel]     = usePersistentState<any>("search_sel", null);
  const [loading,setLoad]= useState(false);
  const [detail,setDetail]=usePersistentState<any>("search_detail", null);
  const [error,setError] = useState("");
  const [qty,setQty]     = usePersistentState<string>("search_qty", "1");
  const [buyPx,setBuyPx] = usePersistentState<string>("search_buyPx", "");
  const [buyDt,setBuyDt] = usePersistentState<string>("search_buyDt", new Date().toISOString().slice(0,10));
  const [cat,setCat]     = usePersistentState<any>("search_cat", undefined);
  const debounce         = useRef<any>(null);

  const doSearch = useCallback(async (val, category) => {
    setSrch(true); setError("");
    try {
      const data = await searchSecurities(val, category);
      setRes(data);
    } catch(e:any) {
      setError(`SEARCH ERROR: ${e.message}`);
    } finally { setSrch(false); }
  },[]);

  // Load category results immediately when category changes (even without query)
  useEffect(()=>{
    clearTimeout(debounce.current);
    doSearch(q, cat);
  },[cat]);

  const handleInput = (v) => {
    setQ(v); setSel(null); setDetail(null);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(()=>doSearch(v, cat), 400);
  };

  const selectSecurity = async (r) => {
    setSel(r); setLoad(true); setDetail(null); setError(""); setQty("1");
    setHistInfo({kind:null, text:""});
    try {
      const d = await fetchQuote(r.symbol);
      d.sector  = d.sector  || r.sector  || "N/A";
      d.industry= d.industry|| r.industry|| "N/A";
      d.type    = d.type    || r.type    || "EQUITY";
      d.geo     = d.geo     || r.geo     || "N/A";
      setDetail(d);
      setBuyPx(d.price!=null?String(d.price.toFixed(2)):"");
      setBuyDt(new Date().toISOString().slice(0,10));
    } catch(e:any) {
      setError(`QUOTE ERROR: ${e.message}`);
    } finally { setLoad(false); }
  };

  const { user } = useUser();
  const [watchMsg, setWatchMsg] = useState("");
  const [watchBusy, setWatchBusy] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  // Historical price lookup state (Finnhub → Yahoo fallback → live-price fallback)
  const [histBusy, setHistBusy] = useState(false);
  const [histInfo, setHistInfo] = useState<{kind:"ok"|"warn"|"err"|null; text:string}>({kind:null, text:""});

  const todayYmd = new Date().toISOString().slice(0,10);

  const handleDateChange = useCallback(async (newDate:string) => {
    setBuyDt(newDate);
    if (!detail) return;
    // If user picked today (or empty), just keep the live price and clear the message.
    if (!newDate || newDate === todayYmd || newDate > todayYmd) {
      setHistInfo({kind:null, text:""});
      return;
    }
    // Past date → fetch historical close.
    setHistBusy(true); setHistInfo({kind:null, text:"Fetching historical price..."});
    try {
      const sym = detail.ticker || detail.symbol;
      const res = await fetchHistoricalPrice(sym, newDate);
      if (res.price != null) {
        setBuyPx(res.price.toFixed(2));
        const sameDay = res.actualDate === newDate;
        setHistInfo({
          kind:"ok",
          text: sameDay
            ? `Historical close (${res.actualDate})`
            : `No trading on ${newDate}. Using close of ${res.actualDate}`,
        });
      } else {
        // Fallback to live price + warn the user (option B).
        if (detail.price != null) setBuyPx(detail.price.toFixed(2));
        setHistInfo({
          kind:"warn",
          text:`Historical price unavailable — using current live price. Reason: ${res.reason || "not found"}`,
        });
      }
    } catch (e:any) {
      if (detail.price != null) setBuyPx(detail.price.toFixed(2));
      setHistInfo({kind:"err", text:`Lookup error — using current live price. (${e.message || "network"})`});
    } finally {
      setHistBusy(false);
    }
  }, [detail, todayYmd, setBuyDt, setBuyPx]);
  const addWatch = async () => {
    if (!detail) return;
    if (!user) { window.location.href = "/auth"; return; }
    setWatchBusy(true); setWatchMsg("");
    try {
      await srvAddWatch({ data: { symbol: detail.ticker || detail.symbol, name: detail.shortName, category: detail.category } });
      setWatchMsg("✓ ADDED");
    } catch(e:any) {
      setWatchMsg("ERR: " + (e.message || "").slice(0, 30));
    } finally {
      setWatchBusy(false);
      setTimeout(() => setWatchMsg(""), 2000);
    }
  };

  const add = () => {
    if (!detail) return;
    const q1 = parseFloat(qty) || 1;
    const px = parseFloat(buyPx);
    const costPrice = isFinite(px) && px>0 ? px : (detail.price || 0);
    onAdd(detail, q1, costPrice, buyDt);
    // Keep search results & detail view open so user can continue browsing.
    // Just give a clear confirmation that the position was added.
    setAddMsg(`✓ ADDED ${q1} ${detail.ticker || detail.symbol} @ ${costPrice.toFixed(2)}`);
    setTimeout(() => setAddMsg(""), 3000);
  };

  const inP = (sym) => portfolio.some(h => h.asset.ticker===sym || h.asset.symbol===sym);

  if (sel && detail) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.blue,padding:"4px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <span style={{fontSize:13,color:B.white,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{detail.ticker}</span>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.7)",marginLeft:6,fontFamily:"'Courier New',monospace"}}>{detail.exchange}</span>
        </div>
        <button onClick={()=>{setSel(null);setDetail(null);}} style={{background:"none",border:"none",color:B.white,cursor:"pointer",fontSize:17,fontFamily:"'Courier New',monospace"}}>X CLOSE</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80,padding:8}}>
        <div style={{fontSize:17,color:B.gray1,fontFamily:"'Courier New',monospace",marginBottom:8}}>{detail.shortName}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
          {[
            {l:"PRICE",v:detail.price!=null?detail.price.toFixed(2):"---",col:B.yellow},
            {l:"DAY %",v:detail.dayChangePct!=null?`${pSign(fmt(detail.dayChangePct,2))}%`:"---",col:pCol(detail.dayChangePct)},
            {l:"YTD %",v:detail.ytd!=null?`${pSign(fmt(detail.ytd,1))}%`:"---",col:pCol(detail.ytd)},
            {l:"VOL %",v:detail.vol!=null?`${fmt(detail.vol,1)}%`:"---",col:B.white},
            {l:"CURRENCY",v:detail.currency||"USD",col:B.cyan},
            {l:"SECTOR",v:detail.sector||"N/A",col:B.gray1},
          ].map((k,i)=>(
            <div key={i} style={{border:`1px solid ${B.border}`,padding:"4px 6px"}}>
              <div style={{fontSize:16,color:B.gray3,fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>{k.l}</div>
              <div style={{fontSize:16,color:k.col,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{border:`1px solid ${B.blue}`,padding:8,marginTop:8}}>
          <div style={{fontSize:15,color:B.blue,fontFamily:"'Courier New',monospace",marginBottom:6,fontWeight:700}}>ADD TO PORTFOLIO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.3fr",gap:6,marginBottom:6}}>
            <div>
              <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>QUANTITY</div>
              <input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="0" step="any"
                style={{width:"100%",background:B.bg,border:`1px solid ${B.border}`,color:B.yellow,
                  padding:"4px 6px",fontSize:13,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>BUY PRICE</div>
              <input value={buyPx} onChange={e=>setBuyPx(e.target.value)} type="number" min="0" step="any"
                placeholder={detail.price!=null?detail.price.toFixed(2):""}
                style={{width:"100%",background:B.bg,border:`1px solid ${B.border}`,color:B.yellow,
                  padding:"4px 6px",fontSize:13,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>PURCHASE DATE</div>
              <input value={buyDt} onChange={e=>handleDateChange(e.target.value)} type="date" max={todayYmd}
                data-testid="search-purchase-date"
                style={{width:"100%",background:B.bg,border:`1px solid ${histBusy?B.blue:B.border}`,color:B.cyan,
                  padding:"4px 6px",fontSize:13,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
          </div>
          {histInfo.text && (
            <div data-testid="search-historical-status" style={{
              padding:"4px 8px", marginBottom:6, fontSize:12, fontWeight:700,
              fontFamily:"'Courier New',monospace", letterSpacing:"0.04em",
              border:`1px solid ${histInfo.kind==="ok"?B.green:histInfo.kind==="warn"?B.yellow:histInfo.kind==="err"?B.red:B.border}`,
              color: histInfo.kind==="ok"?B.green:histInfo.kind==="warn"?B.yellow:histInfo.kind==="err"?B.red:B.gray2,
              background: B.panel2,
            }}>
              {histBusy ? "⏱ " : histInfo.kind==="ok" ? "✓ " : histInfo.kind==="warn" ? "⚠ " : histInfo.kind==="err" ? "✗ " : ""}
              {histInfo.text}
            </div>
          )}
          <div style={{fontSize:15,color:B.gray2,fontFamily:"'Courier New',monospace",marginBottom:6}}>
            COST = ${fmtM((parseFloat(qty)||0)*(parseFloat(buyPx)||detail.price||0))}
            {" · "}MKT = ${fmtM((parseFloat(qty)||0)*(detail.price||0))}
          </div>
          {addMsg && (
            <div style={{
              padding:"6px 8px", marginBottom:6,
              background:"#003300", border:`1px solid ${B.green || "#00FF66"}`,
              color: B.green || "#00FF66",
              fontFamily:"'Courier New',monospace", fontSize:14, fontWeight:700,
              letterSpacing:"0.06em", textAlign:"center",
            }}>
              {addMsg}
            </div>
          )}
          <button onClick={add} style={{
            width:"100%",background:B.blue,border:"none",color:B.white,
            padding:"6px",cursor:"pointer",fontFamily:"'Courier New',monospace",
            fontSize:17,fontWeight:700,letterSpacing:"0.08em"}}>
            ADD POSITION
          </button>
          <button onClick={addWatch} disabled={watchBusy} style={{
            width:"100%",marginTop:6,background:"transparent",border:`1px solid ${B.yellow}`,color:B.yellow,
            padding:"6px",cursor:watchBusy?"wait":"pointer",fontFamily:"'Courier New',monospace",
            fontSize:13,fontWeight:700,letterSpacing:"0.08em"}}>
            {watchBusy ? "..." : watchMsg || "★ ADD TO WATCHLIST"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"6px",borderBottom:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
        <input value={q} onChange={e=>handleInput(e.target.value)}
          placeholder="SEARCH TICKER, ISIN OR NAME..."
          style={{width:"100%",background:B.bg,border:`1px solid ${B.blue}`,color:B.yellow,
            padding:"8px 10px",fontSize:16,fontFamily:"'Courier New',monospace",outline:"none",
            letterSpacing:"0.04em",textTransform:"uppercase"}}/>
        <div style={{display:"flex",gap:3,marginTop:6,overflowX:"auto",paddingBottom:2}}>
          {CATEGORY_TABS.map(c=>{
            const active=cat===c.id;
            return (
              <button key={c.label} onClick={()=>setCat(c.id)} style={{
                background:active?B.blue:B.panel,border:`1px solid ${active?B.blue:B.border}`,
                color:active?B.white:B.gray1,padding:"4px 10px",cursor:"pointer",
                fontFamily:"'Courier New',monospace",fontSize:13,fontWeight:700,
                letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{c.label}</button>
            );
          })}
        </div>
      </div>
      {error && <ErrMsg msg={error}/>}
      {loading && <Spinner text="LOADING QUOTE..."/>}

      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {searching&&<Spinner text="QUERYING MARKETS..."/>}
        {results.map((r,i)=>{
          const added=inP(r.symbol);
          return (
            <div key={r.symbol+i} onClick={()=>selectSecurity(r)}
              style={{display:"grid",gridTemplateColumns:"72px 1fr 70px",
                padding:"8px 10px",cursor:"pointer",borderBottom:`1px solid ${B.border}`,
                background:added?"#001122":"transparent",alignItems:"center",gap:6}}>
              <span style={{fontSize:16,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>
                {r.symbol}{added?" ✓":""}
              </span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:16,color:B.gray1,fontFamily:"'Courier New',monospace",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.shortName}</div>
                <div style={{fontSize:17,color:B.gray3,fontFamily:"'Courier New',monospace"}}>{r.exchange}</div>
              </div>
              <span style={{fontSize:17,color:B.yellow,fontFamily:"'Courier New',monospace",
                textAlign:"right",fontWeight:700}}>{r.category||r.type}</span>
            </div>
          );
        })}
        {!searching&&q.trim()&&results.length===0&&(
          <div style={{padding:"14px 10px",fontSize:13,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
            NO RESULTS FOR "{q.toUpperCase()}"
          </div>
        )}
      </div>
    </div>
  );
}

function PortfolioPage({holdings,onRemove}:any) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  if (!holdings.length) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
      <div style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center",lineHeight:1.8}}>
        NO SECURITIES IN PORTFOLIO<br/>USE SEARCH TO ADD LIVE POSITIONS
      </div>
    </div>
  );

  // Sort by market value desc for visual hierarchy
  const sorted = [...holdings].sort((a:any,b:any) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* KPI Summary Bar */}
      <div style={{background:"linear-gradient(180deg, "+B.blue+" 0%, #0044AA 100%)",
        display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",
        gap:1, flexShrink:0, padding:1}}>
        {[
          {l:"TOTAL VALUE",v:`$${fmtM(m.total)}`,ic:"$"},
          {l:"EXPECTED RETURN",   v:`${pSign(fmt(m.wRet,1))}%`,ic:"↗"},
          {l:"VOLATILITY",v:`${fmt(m.wVol,1)}%`,ic:"σ"},
          {l:"SHARPE RATIO",    v:fmt(m.sharpe,2),ic:"S"},
        ].map((k,i)=>(
          <div key={i} style={{padding:"8px 12px",background:"rgba(0,0,0,0.15)",
            display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",
              letterSpacing:"0.12em",fontFamily:"'Courier New',monospace"}}>{k.l}</div>
            <div style={{fontSize:17,color:B.white,fontWeight:700,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Position count + total */}
      <div style={{padding:"5px 10px",background:B.panel2,borderBottom:`1px solid ${B.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:11,color:B.gray2,fontFamily:"'Courier New',monospace",
          letterSpacing:"0.08em",textTransform:"uppercase"}}>
          {holdings.length} POSITION{holdings.length!==1?"S":""} · SORTED BY VALUE
        </span>
        <span style={{fontSize:11,color:B.cyan,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
          LIVE MARKET DATA
        </span>
      </div>

      {/* Card list */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:80,background:B.bg}}>
        {sorted.map((h:any,i:number) => {
          const w = m.total > 0 ? (h.value / m.total * 100) : 0;
          const cb = h.costBasis ?? (h.costPrice != null ? h.costPrice * h.qty : null);
          const pl = cb != null ? h.value - cb : null;
          const plPct = (cb != null && cb > 0) ? (pl! / cb * 100) : null;
          const dayC = h.asset.dayChangePct;
          const barCol = SERIES_COLS[i % SERIES_COLS.length];

          return (
            <div key={h.isin||h.asset.ticker} style={{
              background:B.panel,
              borderBottom:`1px solid ${B.border}`,
              padding:"10px 12px",
              display:"flex",flexDirection:"column",gap:8,
              fontFamily:"'Courier New',monospace",
              position:"relative",
            }}>
              {/* Row 1: Ticker + name + close */}
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:17,color:B.blue,fontWeight:700,letterSpacing:"0.04em"}}>{h.asset.ticker}</span>
                <span style={{fontSize:12,color:B.gray2,flex:1,overflow:"hidden",textOverflow:"ellipsis",
                  whiteSpace:"nowrap",letterSpacing:"0.02em"}}>
                  {h.asset.shortName || h.asset.name || ""}
                </span>
                <button onClick={()=>onRemove(h.isin||h.asset.ticker)} title="Remove position" style={{
                  background:"transparent",border:`1px solid ${B.gray4}`,color:B.gray3,cursor:"pointer",
                  fontSize:11,padding:"1px 6px",fontFamily:"'Courier New',monospace",lineHeight:1.3,
                }}>✕</button>
              </div>

              {/* Row 2: Price · DAY% chip · Value · Weight */}
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>PRICE</div>
                  <div style={{fontSize:15,color:B.yellow,fontWeight:700,letterSpacing:"-0.02em"}}>
                    {h.asset.price!=null ? h.asset.price.toLocaleString(undefined,{maximumFractionDigits:2}) : "---"}
                  </div>
                </div>
                <div style={{
                  padding:"3px 8px",
                  background: dayC != null ? (dayC >= 0 ? "rgba(0,255,102,0.12)" : "rgba(255,51,51,0.12)") : "transparent",
                  border:`1px solid ${dayC != null ? pCol(dayC) : B.border}`,
                  minWidth:64,textAlign:"center",
                }}>
                  <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.1em",textTransform:"uppercase"}}>DAY</div>
                  <div style={{fontSize:13,color:pCol(dayC),fontWeight:700}}>
                    {dayC!=null ? `${pSign(fmt(dayC,2))}%` : "—"}
                  </div>
                </div>
                <div style={{marginLeft:"auto",textAlign:"right"}}>
                  <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>MKT VALUE</div>
                  <div style={{fontSize:15,color:B.yellow,fontWeight:700}}>${fmtM(h.value)}</div>
                </div>
                <div style={{textAlign:"right",minWidth:64}}>
                  <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>WEIGHT</div>
                  <div style={{fontSize:13,color:B.cyan,fontWeight:700}}>{w.toFixed(1)}%</div>
                </div>
              </div>

              {/* Weight bar */}
              <div style={{height:3,background:B.panel2,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${Math.min(100,w)}%`,
                  background:barCol,transition:"width 0.3s ease"}}/>
              </div>

              {/* Row 3: Cost/P&L strip */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(88px, 1fr))",gap:6,
                paddingTop:4,borderTop:`1px dashed ${B.border}`}}>
                <div>
                  <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>QTY</div>
                  <div style={{fontSize:12,color:B.gray1,fontWeight:700}}>{fmt(h.qty,h.qty<1?4:2)}</div>
                </div>
                {h.costPrice != null && (
                  <div>
                    <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>AVG COST</div>
                    <div style={{fontSize:12,color:B.gray1,fontWeight:700}}>${fmt(h.costPrice,2)}</div>
                  </div>
                )}
                {cb != null && (
                  <div>
                    <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>COST BASIS</div>
                    <div style={{fontSize:12,color:B.gray1,fontWeight:700}}>${fmtM(cb)}</div>
                  </div>
                )}
                {h.buyDate && (
                  <div>
                    <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>SINCE</div>
                    <div style={{fontSize:12,color:B.cyan,fontWeight:700}}>{h.buyDate}</div>
                  </div>
                )}
                {pl != null && (
                  <div style={{gridColumn:"span 2"}}>
                    <div style={{fontSize:9,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase"}}>UNREALIZED P&L</div>
                    <div style={{fontSize:13,color:pCol(pl),fontWeight:700}}>
                      {pl >= 0 ? "+" : "−"}${fmtM(Math.abs(pl))} <span style={{color:B.gray3}}>·</span> {pSign(fmt(plPct!,2))}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Total footer */}
        <div style={{padding:"10px 12px",background:B.panel2,borderTop:`2px solid ${B.blue}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:"0.08em"}}>PORTFOLIO TOTAL</span>
          <span style={{fontSize:17,color:B.yellow,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:"-0.02em"}}>
            ${fmtM(m.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function computeAlerts(holdings:any[], m:any) {
  const alerts: {sev:"HIGH"|"MED"|"LOW"|"OK", title:string, detail:string, metric:string}[] = [];
  if (!holdings.length) return alerts;

  // 1. Single-position concentration
  const maxWeight = Math.max(...holdings.map((h:any) => (h.value / m.total) * 100));
  const topPos = holdings.find((h:any) => (h.value / m.total) * 100 === maxWeight);
  if (maxWeight > 40) alerts.push({sev:"HIGH", title:"SINGLE-NAME CONCENTRATION", metric:`${maxWeight.toFixed(1)}%`,
    detail:`${topPos?.asset.ticker} exceeds 40% of portfolio. Consider diversifying — a single-name loss could severely impact total return.`});
  else if (maxWeight > 25) alerts.push({sev:"MED", title:"SINGLE-NAME EXPOSURE", metric:`${maxWeight.toFixed(1)}%`,
    detail:`${topPos?.asset.ticker} represents >25% of portfolio. Moderate concentration risk.`});

  // 2. Sector concentration
  const sectorMap = new Map<string,number>();
  holdings.forEach((h:any) => {
    const s = h.asset.sector || h.asset.industry || "OTHER";
    sectorMap.set(s, (sectorMap.get(s)||0) + h.value);
  });
  const secArr = Array.from(sectorMap.entries()).map(([k,v]) => ({k, pct: v/m.total*100})).sort((a,b)=>b.pct-a.pct);
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

const SEV_STYLE:any = {
  HIGH: { border: "#FF3333", bg: "rgba(255,51,51,0.08)", text: "#FF3333", icon: "⚠", label: "HIGH RISK" },
  MED:  { border: "#FFA500", bg: "rgba(255,165,0,0.08)", text: "#FFA500", icon: "◆", label: "MEDIUM" },
  LOW:  { border: "#00FFFF", bg: "rgba(0,255,255,0.06)", text: "#00FFFF", icon: "ℹ", label: "INFO" },
  OK:   { border: "#00FF66", bg: "rgba(0,255,102,0.06)", text: "#00FF66", icon: "✓", label: "OK" },
};

function AnalysisPage({holdings}:any) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  const [sub,setSub]=usePersistentState<string>("analysis_sub", "alloc");
  const [aiExplain, setAiExplain] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  if (!holdings.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace"}}>NO DATA — ADD SECURITIES VIA SEARCH</span>
    </div>
  );
  const sD=groupBy(holdings,"sector",m.total);
  const gD=groupBy(holdings,"geo",m.total);
  const tD=groupBy(holdings,"type",m.total);

  const alerts = useMemo(() => computeAlerts(holdings, m), [holdings, m]);
  const highCount = alerts.filter(a => a.sev==="HIGH").length;
  const medCount  = alerts.filter(a => a.sev==="MED").length;

  const explainAlerts = async () => {
    if (!alerts.length || aiBusy) return;
    setAiBusy(true); setAiExplain("");
    try {
      const alertsText = alerts.map((a, i) =>
        `${i+1}. [${a.sev}] ${a.title} (${a.metric}): ${a.detail}`
      ).join("\n");
      const positionsText = holdings.map((h:any) =>
        `${h.asset.ticker} — ${((h.value/m.total)*100).toFixed(1)}% weight, sector: ${h.asset.sector || "N/A"}`
      ).join("\n");
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL analytics assistant. NO personalized investment advice under MiFID II. Frame everything as HYPOTHETICAL SCENARIOS and QUANTITATIVE OBSERVATIONS.
Given a set of exposure alerts, explain what they mean educationally and describe HYPOTHETICAL rebalancing SCENARIOS (not recommendations) that would statistically reduce the flagged risks — e.g. "a scenario where MSFT weight was reduced from 66% to 25% would lower HHI by ~X points and reduce single-name concentration".
Structure: 1) brief overview 2) 2-3 key hypothetical scenarios with quantitative rationale 3) BOTTOM LINE. Use **bold** for key metrics.
ALWAYS end with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."
Max 250 words. Respond in ENGLISH.`;
      const prompt = `My hypothetical portfolio positions:\n${positionsText}\n\nActive risk alerts flagged by the system:\n${alertsText}\n\nExplain these alerts and outline hypothetical rebalancing scenarios (educational only).`;
      const { reply } = await aiChat({ data: { messages: [{role:"user", content: prompt}], system: sys } });
      setAiExplain(reply);
    } catch (e:any) {
      setAiExplain("AI error: " + e.message);
    } finally { setAiBusy(false); }
  };

  // Performance data
  const perfData = useMemo(() => {
    const rows = holdings.map((h:any) => {
      const cb = h.costBasis ?? (h.costPrice != null ? h.costPrice * h.qty : null);
      const pl = cb != null ? h.value - cb : 0;
      const plPct = (cb != null && cb > 0) ? (pl / cb * 100) : 0;
      const contribPct = m.total > 0 ? (pl / m.total * 100) : 0;
      return {
        ticker: h.asset.ticker,
        name: h.asset.shortName || h.asset.name || h.asset.ticker,
        weight: h.value / m.total * 100,
        pl, plPct, contribPct,
        ytd: h.asset.ytd ?? 0,
        day: h.asset.dayChangePct ?? 0,
      };
    });
    return rows;
  }, [holdings, m.total]);

  const totalPL = perfData.reduce((s,r) => s + r.pl, 0);
  const totalCost = holdings.reduce((s:number, h:any) => s + (h.costBasis ?? (h.costPrice||0)*h.qty), 0);
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost * 100) : 0;
  const winners = perfData.filter(r => r.pl > 0).sort((a,b)=>b.pl-a.pl);
  const losers  = perfData.filter(r => r.pl < 0).sort((a,b)=>a.pl-b.pl);
  const contribSorted = [...perfData].sort((a,b) => Math.abs(b.contribPct) - Math.abs(a.contribPct));

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:2,padding:"3px 4px",borderBottom:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
        {[{id:"alloc",l:"ALLOCATION"},{id:"risk",l:`RISK${highCount+medCount>0?` (${highCount+medCount})`:""}`},{id:"perf",l:"PERFORMANCE"}].map(t=>(
          <FKey key={t.id} label={t.l} active={sub===t.id} onClick={()=>setSub(t.id)}/>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {sub==="alloc"&&(
          <div>
            {[{data:sD,t:"SECTOR BREAKDOWN"},{data:gD,t:"GEOGRAPHIC BREAKDOWN"},{data:tD,t:"ASSET CLASS"}].map(({data,t})=>(
              <BPanel key={t} title={t} style={{marginBottom:1}}>
                <div style={{padding:"6px 10px"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={1} dataKey="value" strokeWidth={0}>
                          {data.map((_,i)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{flex:1}}>
                      {data.slice(0,6).map((d,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <div style={{width:8,height:8,background:PIE_COLS[i%PIE_COLS.length],flexShrink:0}}/>
                          <span style={{fontSize:12,color:B.gray1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"}}>{d.name}</span>
                          <span style={{fontSize:12,color:B.yellow,fontFamily:"'Courier New',monospace",flexShrink:0,fontWeight:700}}>{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BPanel>
            ))}
          </div>
        )}

        {sub==="risk"&&(
          <div>
            {/* Risk summary strip */}
            <div style={{background:"linear-gradient(180deg, "+B.panel2+" 0%, "+B.bg+" 100%)",
              padding:"10px 12px",borderBottom:`1px solid ${B.border}`,
              display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:8}}>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>ALERTS ACTIVE</div>
                <div style={{fontSize:17,fontWeight:700,fontFamily:"'Courier New',monospace",
                  color: highCount>0?B.red:medCount>0?"#FFA500":B.green}}>
                  {highCount>0?`${highCount} HIGH`:medCount>0?`${medCount} MED`:"NONE"}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>VaR 95% (1D)</div>
                <div style={{fontSize:15,color:B.yellow,fontWeight:700,fontFamily:"'Courier New',monospace"}}>-{fmt(m.wVol/Math.sqrt(252)*1.645,2)}%</div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>MAX DRAWDOWN EST</div>
                <div style={{fontSize:15,color:B.red,fontWeight:700,fontFamily:"'Courier New',monospace"}}>-{fmt(m.wVol*2.5,1)}%</div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>HHI</div>
                <div style={{fontSize:15,fontWeight:700,fontFamily:"'Courier New',monospace",
                  color:m.hhi>3000?B.red:m.hhi>1800?"#FFA500":B.green}}>{m.hhi.toFixed(0)}</div>
              </div>
            </div>

            {/* Alerts list */}
            <BPanel title="EXPOSURE ALERTS &amp; RISK CHECKS" style={{marginTop:1}}>
              <div style={{padding:"6px 12px",background:B.panel,borderBottom:`1px solid ${B.border}`,
                display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
                  {alerts.length} CHECK{alerts.length!==1?"S":""} EVALUATED
                </span>
                <button data-testid="risk-ai-explain-btn" onClick={explainAlerts} disabled={aiBusy || alerts[0]?.sev==="OK"} style={{
                  background:"transparent", border:`1px solid ${B.cyan}`, color:B.cyan,
                  padding:"4px 12px", cursor: alerts[0]?.sev==="OK" ? "not-allowed" : "pointer",
                  fontFamily:"'Courier New',monospace", fontSize:12, fontWeight:700, letterSpacing:"0.08em",
                  opacity: alerts[0]?.sev==="OK" ? 0.4 : 1,
                }}>
                  {aiBusy ? "ANALYZING…" : "✦ EXPLAIN ALL ALERTS"}
                </button>
              </div>
              {aiExplain && (
                <div style={{padding:"10px 12px",background:"#001a1a",borderBottom:`1px solid ${B.cyan}`,
                  fontFamily:"'Courier New',monospace"}}>
                  <div style={{fontSize:12,color:B.cyan,fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>
                    ✦ STRATEGIC MARKETS AI — HYPOTHETICAL SCENARIOS
                  </div>
                  {aiExplain.split("\n").map((line, i) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <div key={i} style={{fontSize:12,color:B.gray1,lineHeight:1.55,marginBottom:2}}>
                        {parts.map((p, j) =>
                          p.startsWith("**") && p.endsWith("**")
                            ? <span key={j} style={{color:B.yellow,fontWeight:700}}>{p.slice(2,-2)}</span>
                            : p
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{padding:0}}>
                {alerts.map((a, i) => {
                  const s = SEV_STYLE[a.sev];
                  return (
                    <div key={i} style={{
                      display:"flex",alignItems:"flex-start",gap:10,
                      padding:"10px 12px",
                      background:s.bg,
                      borderLeft:`3px solid ${s.border}`,
                      borderBottom:`1px solid ${B.border}`,
                      fontFamily:"'Courier New',monospace",
                    }}>
                      <div style={{fontSize:20,color:s.text,lineHeight:1,paddingTop:2}}>{s.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:700,color:s.text,letterSpacing:"0.06em"}}>{a.title}</span>
                          <span style={{fontSize:10,color:s.text,padding:"1px 5px",border:`1px solid ${s.border}`,letterSpacing:"0.08em"}}>{s.label}</span>
                          <span style={{fontSize:11,color:B.gray3,marginLeft:"auto",fontWeight:700}}>{a.metric}</span>
                        </div>
                        <div style={{fontSize:12,color:B.gray1,lineHeight:1.5}}>{a.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </BPanel>

            {/* Detailed risk metrics table */}
            <BPanel title="DETAILED RISK METRICS" style={{marginTop:1}}>
              <div style={{padding:"4px 10px"}}>
                {[
                  {l:"VOLATILITY (ANNUALIZED)",  v:`${fmt(m.wVol,1)}%`,          col:m.wVol>25?B.red:m.wVol>15?"#FFA500":B.green, note:"Std. deviation of returns"},
                  {l:"VaR 95% (1-DAY)",          v:`-${fmt(m.wVol/Math.sqrt(252)*1.645,2)}%`, col:B.yellow, note:"Worst expected loss with 95% confidence"},
                  {l:"VaR 99% (1-DAY)",          v:`-${fmt(m.wVol/Math.sqrt(252)*2.326,2)}%`, col:B.red, note:"Tail-risk with 99% confidence"},
                  {l:"CVaR 95% (EXPECTED LOSS)", v:`-${fmt(m.wVol/Math.sqrt(252)*2.06,2)}%`, col:B.red, note:"Avg loss in worst 5% scenarios"},
                  {l:"MAX DRAWDOWN ESTIMATE",    v:`-${fmt(m.wVol*2.5,1)}%`,     col:B.red, note:"Peak-to-trough historical estimate"},
                  {l:"SHARPE RATIO",             v:fmt(m.sharpe,2),              col:m.sharpe>0.7?B.green:m.sharpe>0.3?"#FFA500":B.red, note:"Return per unit of risk (rf=4%)"},
                  {l:"BETA (vs S&P 500)",        v:fmt(m.wBeta,2),               col:m.wBeta>1.3?B.red:m.wBeta<0.7?B.cyan:B.white, note:"Systematic risk sensitivity"},
                  {l:"HHI CONCENTRATION INDEX",  v:m.hhi.toFixed(0),             col:m.hhi>3000?B.red:m.hhi>1800?"#FFA500":B.green, note:"Herfindahl-Hirschman index"},
                ].map((r,i)=>(
                  <div key={i} style={{padding:"6px 0",borderBottom:i<7?`1px solid ${B.border}`:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                      <span style={{fontSize:12,color:B.gray1,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:"0.04em"}}>{r.l}</span>
                      <span style={{fontSize:13,color:r.col,fontFamily:"'Courier New',monospace",fontWeight:700}}>{r.v}</span>
                    </div>
                    <div style={{fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",fontStyle:"italic"}}>{r.note}</div>
                  </div>
                ))}
              </div>
            </BPanel>
          </div>
        )}

        {sub==="perf"&&(
          <div>
            {/* Total P&L header */}
            <div style={{background:"linear-gradient(180deg, "+B.panel2+" 0%, "+B.bg+" 100%)",
              padding:"12px",borderBottom:`1px solid ${B.border}`,
              display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:10}}>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>UNREALIZED P&L</div>
                <div style={{fontSize:20,color:pCol(totalPL),fontWeight:700,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}>
                  {totalPL >= 0 ? "+" : "−"}${fmtM(Math.abs(totalPL))}
                </div>
                <div style={{fontSize:12,color:pCol(totalPL),fontFamily:"'Courier New',monospace",fontWeight:700}}>
                  {pSign(fmt(totalPLPct,2))}%
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>COST BASIS</div>
                <div style={{fontSize:15,color:B.gray1,fontWeight:700,fontFamily:"'Courier New',monospace"}}>${fmtM(totalCost)}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>WINNERS / LOSERS</div>
                <div style={{fontSize:15,fontWeight:700,fontFamily:"'Courier New',monospace"}}>
                  <span style={{color:B.green}}>{winners.length}</span>
                  <span style={{color:B.gray3}}> / </span>
                  <span style={{color:B.red}}>{losers.length}</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:B.gray3,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Courier New',monospace"}}>DAY CHANGE</div>
                <div style={{fontSize:15,color:pCol(m.wDay),fontFamily:"'Courier New',monospace",fontWeight:700}}>
                  {pSign(fmt(m.wDay,2))}%
                </div>
              </div>
            </div>

            {/* P&L per position — horizontal bar chart */}
            <BPanel title="UNREALIZED P&L PER POSITION" style={{marginTop:1}}>
              <div style={{padding:"6px 0"}}>
                {(() => {
                  const maxAbs = Math.max(1, ...perfData.map(r => Math.abs(r.pl)));
                  return [...perfData].sort((a,b) => b.pl - a.pl).map((r, i) => {
                    const barPct = Math.abs(r.pl) / maxAbs * 50; // 50% max each side
                    const isPositive = r.pl >= 0;
                    return (
                      <div key={r.ticker} style={{display:"flex",alignItems:"center",gap:8,
                        padding:"6px 12px",borderBottom:`1px solid ${B.border}`,fontFamily:"'Courier New',monospace"}}>
                        <span style={{fontSize:12,color:B.blue,fontWeight:700,minWidth:48,letterSpacing:"0.04em"}}>{r.ticker}</span>
                        <div style={{flex:1,position:"relative",height:14,background:B.panel2}}>
                          {/* center line */}
                          <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:B.border,zIndex:1}}/>
                          {/* bar */}
                          <div style={{position:"absolute",top:2,bottom:2,
                            left: isPositive ? "50%" : `${50 - barPct}%`,
                            width: `${barPct}%`,
                            background: pCol(r.pl),
                            opacity: 0.85,
                          }}/>
                        </div>
                        <span style={{fontSize:12,color:pCol(r.pl),fontWeight:700,minWidth:80,textAlign:"right"}}>
                          {isPositive?"+":"−"}${fmtM(Math.abs(r.pl))}
                        </span>
                        <span style={{fontSize:11,color:B.gray3,fontWeight:700,minWidth:60,textAlign:"right"}}>
                          {pSign(fmt(r.plPct,1))}%
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </BPanel>

            {/* Contribution to total return */}
            <BPanel title="CONTRIBUTION TO TOTAL RETURN" style={{marginTop:1}}>
              <div style={{padding:"6px 12px 4px",fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",
                fontStyle:"italic",lineHeight:1.5}}>
                How much each position moved your overall portfolio P&L (in %-points of total value).
              </div>
              <div>
                {contribSorted.slice(0, 8).map((r) => {
                  const maxContrib = Math.max(0.001, ...contribSorted.map(x => Math.abs(x.contribPct)));
                  const pct = Math.abs(r.contribPct) / maxContrib * 100;
                  return (
                    <div key={r.ticker} style={{padding:"6px 12px",borderBottom:`1px solid ${B.border}`,
                      display:"flex",alignItems:"center",gap:8,fontFamily:"'Courier New',monospace"}}>
                      <span style={{fontSize:12,color:B.blue,fontWeight:700,minWidth:48}}>{r.ticker}</span>
                      <div style={{flex:1,height:8,background:B.panel2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:pCol(r.contribPct)}}/>
                      </div>
                      <span style={{fontSize:12,color:pCol(r.contribPct),fontWeight:700,minWidth:70,textAlign:"right"}}>
                        {pSign(fmt(r.contribPct,2))}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </BPanel>

            {/* Winners / Losers side by side */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,marginTop:1}}>
              <BPanel title={`TOP GAINERS (${winners.length})`}>
                <div style={{padding:0}}>
                  {winners.slice(0,5).map(r => (
                    <div key={r.ticker} style={{padding:"6px 10px",borderBottom:`1px solid ${B.border}`,
                      display:"flex",justifyContent:"space-between",fontFamily:"'Courier New',monospace"}}>
                      <span style={{fontSize:12,color:B.blue,fontWeight:700}}>{r.ticker}</span>
                      <span style={{fontSize:12,color:B.green,fontWeight:700}}>+{fmt(r.plPct,1)}%</span>
                    </div>
                  ))}
                  {winners.length === 0 && (
                    <div style={{padding:"10px",fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
                      No positions in profit yet
                    </div>
                  )}
                </div>
              </BPanel>
              <BPanel title={`TOP LOSERS (${losers.length})`}>
                <div style={{padding:0}}>
                  {losers.slice(0,5).map(r => (
                    <div key={r.ticker} style={{padding:"6px 10px",borderBottom:`1px solid ${B.border}`,
                      display:"flex",justifyContent:"space-between",fontFamily:"'Courier New',monospace"}}>
                      <span style={{fontSize:12,color:B.blue,fontWeight:700}}>{r.ticker}</span>
                      <span style={{fontSize:12,color:B.red,fontWeight:700}}>{fmt(r.plPct,1)}%</span>
                    </div>
                  ))}
                  {losers.length === 0 && (
                    <div style={{padding:"10px",fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
                      No losing positions 🎉
                    </div>
                  )}
                </div>
              </BPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SYS_PROMPT=`You are STRATEGIC MARKETS AI, an EDUCATIONAL financial-markets terminal assistant.

# REGULATORY FRAMEWORK (HARD CONSTRAINTS — NEVER VIOLATE)
- You DO NOT provide investment advice, personal recommendations, solicitations or financial planning under MiFID II / SEC / ESMA frameworks.
- You DO NOT say "buy", "sell", "you should invest", "I recommend you to...", "this is a good investment for you", or any equivalent personalized advice.
- You frame all output as: educational analysis, quantitative scenarios, hypothetical case studies, statistical observations, or theoretical examples.
- When discussing the user's portfolio data, treat it as a HYPOTHETICAL DATASET for illustrative analysis, NEVER as a basis for personalized recommendations.
- Replace prescriptive phrasing with descriptive/analytic phrasing:
  • "buy X" → "historically, allocations to X have shown..."
  • "you should reduce Y" → "from a quantitative diversification perspective, lowering exposure to Y would reduce HHI by..."
  • "this is a good ETF" → "this ETF exhibits characteristics such as..."
- ALWAYS end every response with:
  "BOTTOM LINE: [educational summary]
   DISCLAIMER: For educational and informational purposes only. Not investment advice."

# EXPERTISE
Portfolio theory (MPT, CAPM, Fama-French), fundamental analysis (DCF, P/E, EV/EBITDA),
technical analysis, risk management (VaR, CVaR, drawdown), asset allocation,
global markets, ETFs, bonds, commodities, crypto, macro economics, financial regulations.

# STYLE
Concise, data-driven, professional terminal style.
Use CAPS for key terms. Max 280 words. Bold **key metrics** with asterisks.
ALWAYS respond in ENGLISH.`;

const QUICK_Q=["ANALYZE PORTFOLIO","DIVERSIFICATION CHECK","RISK ASSESSMENT","IMPROVE ALLOCATION","EXPLAIN SHARPE","VAR ANALYSIS","SECTOR EXPOSURE","REDUCE VOLATILITY"];

function AIAdvisorPage({holdings}:any) {
  const [msgs,setMsgs]=useState<any[]>([{role:"assistant",content:"**STRATEGIC MARKETS AI TERMINAL ONLINE**\n\nThis is an EDUCATIONAL analytics terminal with access to your simulated portfolio data (stocks, bonds, ETFs, commodities, crypto, REITs, FX).\n\nI can provide quantitative observations on diversification, risk metrics, sector exposure, performance attribution and hypothetical allocation scenarios.\n\n**I do not provide personalized investment recommendations** nor financial advice under MiFID II. All analyses are for educational and informational purposes only.\n\nSMKT>_"}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [showQ,setShowQ]=useState(true);
  const bottomRef=useRef<any>(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const portCtx=useCallback(()=>{
    if(!holdings.length) return "NO PORTFOLIO LOADED.";
    const m=pMet(holdings)!;
    return [
      `LIVE PORTFOLIO SNAPSHOT (${holdings.length} SECURITIES — LIVE MARKET DATA):`,
      `MKT VALUE: $${fmtM(m.total)} | EXP RET: ${fmt(m.wRet,2)}% | VOL: ${fmt(m.wVol,2)}% | SHARPE: ${fmt(m.sharpe,2)} | BETA: ${fmt(m.wBeta,2)} | DIV YIELD: ${fmt(m.wDiv,2)}%`,
      `SECTORS: ${m.sectors} | GEO REGIONS: ${m.geos} | HHI: ${fmt(m.hhi,0)}`,
      "POSITIONS: "+holdings.map(h=>`${h.asset.ticker}(WT:${(h.value/m.total*100).toFixed(0)}%,VOL:${h.asset.vol??'N/A'}%,BETA:${h.asset.beta??'N/A'},YTD:${h.asset.ytd??'N/A'}%,1D:${h.asset.dayChangePct??'N/A'}%,SECT:${h.asset.sector||'N/A'})`).join(" | "),
    ].join("\n");
  },[holdings]);

  const send=async(text?:string)=>{
    const msg=text||input.trim();
    if(!msg||loading) return;
    setInput(""); setShowQ(false);
    const newMsgs=[...msgs,{role:"user",content:msg}];
    setMsgs(newMsgs); setLoading(true);
    const apiMsgs=newMsgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
    apiMsgs[apiMsgs.length-1].content=`[LIVE PORTFOLIO]\n${portCtx()}\n\n[QUERY]\n${msg}`;
    try {
      const { reply } = await aiChat({ data: { messages: apiMsgs, system: SYS_PROMPT } });
      setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    } catch(e:any) {
      setMsgs(m=>[...m,{role:"assistant",content:`ERROR: ${e.message}`}]);
    } finally {setLoading(false);}
  };

  const renderMsg=(text:string)=>text.split("\n").map((line,i)=>{
    if(!line.trim()) return <div key={i} style={{height:4}}/>;
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    const rendered=parts.map((p,j)=>
      p.startsWith("**")&&p.endsWith("**")
        ?<span key={j} style={{color:B.yellow,fontWeight:700}}>{p.slice(2,-2)}</span>:p
    );
    return <div key={i} style={{fontSize:17,color:B.gray1,fontFamily:"'Courier New',monospace",lineHeight:1.6}}>{rendered}</div>;
  });

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,padding:"4px 8px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <span style={{fontSize:13,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>STRATEGIC MARKETS</span>
          <span style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginLeft:8}}>AI FINANCIAL TERMINAL  LOVABLE AI</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={async()=>{
            if(!msgs.length){return;}
            try {
              const title=(msgs[0]?.content||"Chat").slice(0,60);
              await saveConversation({data:{title,messages:msgs}});
              alert("Conversazione salvata nel tuo profilo");
            } catch(e:any){
              if(String(e.message).includes("Unauthorized")){ window.location.href="/auth"; }
              else alert("Errore: "+e.message);
            }
          }} disabled={!msgs.length} style={{
            background:"none",border:`1px solid ${B.green}`,color:B.green,
            fontFamily:"'Courier New',monospace",fontSize:14,fontWeight:700,
            padding:"2px 6px",cursor:msgs.length?"pointer":"not-allowed",opacity:msgs.length?1:0.4}}>
            💾 SAVE
          </button>
          <div style={{width:6,height:6,background:B.green,animation:"blink 2s infinite"}}/>
          <span style={{fontSize:14,color:B.green,fontFamily:"'Courier New',monospace"}}>ONLINE</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:4}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:"4px 8px",borderBottom:`1px solid ${B.border}`,
            background:m.role==="user"?"#000822":"transparent"}}>
            <div style={{fontSize:14,color:m.role==="user"?B.blue:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2,fontWeight:700}}>
              {m.role==="user"?"USER>":"SMKT>"}
            </div>
            <div>{renderMsg(m.content)}</div>
          </div>
        ))}
        {loading&&(
          <div style={{padding:"6px 8px",borderBottom:`1px solid ${B.border}`}}>
            <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>STRATEGIC MARKETS{">"}</div>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {[0,1,2].map(j=>(
                <div key={j} style={{width:5,height:5,background:B.blue,
                  animation:`pulse 1s ${j*0.2}s infinite ease-in-out`}}/>
              ))}
              <span style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace",marginLeft:4}}>PROCESSING LIVE DATA...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {showQ&&(
        <div style={{padding:"3px 4px",borderTop:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
          <div style={{fontSize:16,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:3,paddingLeft:2}}>QUICK COMMANDS:</div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {QUICK_Q.map((q,i)=>(
              <button key={i} onClick={()=>send(q)} disabled={loading} style={{
                background:B.panel,border:`1px solid ${B.border}`,padding:"3px 6px",
                color:B.gray1,fontSize:14,cursor:"pointer",
                fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${B.blue}`,background:B.panel2,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <span style={{fontSize:17,color:B.blue,fontFamily:"'Courier New',monospace",padding:"8px 8px",fontWeight:700}}>{">"}</span>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") send(); }}
            placeholder="ENTER COMMAND OR QUERY..."
            style={{flex:1,background:"transparent",border:"none",
              padding:"8px 0",color:B.yellow,fontSize:17,
              fontFamily:"'Courier New',monospace",outline:"none",
              letterSpacing:"0.04em",textTransform:"uppercase"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
            background:loading||!input.trim()?B.panel2:B.blue,
            border:"none",padding:"8px 12px",color:B.white,
            fontFamily:"'Courier New',monospace",fontSize:15,fontWeight:700,
            cursor:loading||!input.trim()?"not-allowed":"pointer",textTransform:"uppercase"}}>GO</button>
        </div>
        <div style={{fontSize:16,color:B.gray4,fontFamily:"'Courier New',monospace",
          padding:"0 8px 4px",letterSpacing:"0.04em"}}>
          FOR INFORMATIONAL PURPOSES ONLY. NOT FINANCIAL ADVICE.
        </div>
      </div>
    </div>
  );
}

function NewsPage({holdings,setPage}:any) {
  const [tab, setTab] = usePersistentState<"market"|"holdings"|"symbol">("news_tab", "market");
  const [marketCat, setMarketCat] = usePersistentState<string>("news_marketCat", "general");
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [holdNews, setHoldNews] = useState<any[]>([]);
  const [symInput, setSymInput] = usePersistentState<string>("news_symInput", "");
  const [symActive, setSymActive] = usePersistentState<string>("news_symActive", "");
  const [symNews, setSymNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState("");
  const [sentBusy, setSentBusy] = useState(false);

  // Filter state (persisted)
  const [keyword, setKeyword] = usePersistentState<string>("news_keyword", "");
  const [dateRange, setDateRange] = usePersistentState<"24h"|"3d"|"7d"|"14d"|"30d"|"all"|"custom">("news_dateRange", "7d");
  const [customFrom, setCustomFrom] = usePersistentState<string>("news_customFrom", "");
  const [customTo, setCustomTo] = usePersistentState<string>("news_customTo", "");
  const [sourceFilter, setSourceFilter] = usePersistentState<string>("news_sourceFilter", "ALL");
  const [sortMode, setSortMode] = usePersistentState<"newest"|"oldest"|"relevance">("news_sortMode", "newest");
  const [showFilters, setShowFilters] = usePersistentState<boolean>("news_showFilters", false);

  const loadMarket = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const data = await fetchMarketNews(cat);
      setMarketNews(data || []);
    } catch (e:any) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  // Stable key from symbols (does NOT change on price refresh) — prevents
  // holdings news from reloading every minute when parent refreshes quotes.
  const symbolsKey = useMemo(() => (
    Array.from(new Set(
      holdings.map((h:any) => h.asset.ticker || h.asset.symbol).filter(Boolean)
    )).slice(0, 6).join("|")
  ), [holdings]);

  const loadHoldings = useCallback(async () => {
    if (!symbolsKey) { setHoldNews([]); return; }
    const symbols = symbolsKey.split("|");
    setLoading(true);
    try {
      const lists = await Promise.all(symbols.map(s => fetchCompanyNews(s, 14).catch(() => [])));
      const merged = symbols.flatMap((s:string, i:number) => (lists[i] || []).slice(0, 6).map((n:any) => ({...n, _sym: s})));
      merged.sort((a:any, b:any) => (b.datetime || 0) - (a.datetime || 0));
      setHoldNews(merged.slice(0, 60));
    } catch (e:any) {
      console.error(e);
    } finally { setLoading(false); }
  }, [symbolsKey]);

  const daysForFetch = useMemo(() => {
    const map:any = {"24h":1,"3d":3,"7d":7,"14d":14,"30d":30,"all":30,"custom":30};
    return map[dateRange] || 14;
  }, [dateRange]);

  const loadSymbol = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true); setSymActive(sym); setSentiment("");
    try {
      const data = await fetchCompanyNews(sym, daysForFetch);
      setSymNews(data || []);
    } catch (e:any) {
      console.error(e);
    } finally { setLoading(false); }
  }, [daysForFetch]);

  useEffect(() => { loadMarket(marketCat); }, [marketCat, loadMarket]);
  useEffect(() => { if (tab === "holdings") loadHoldings(); }, [tab, loadHoldings]);

  // Re-fetch symbol news when date-range changes (so we ask Finnhub for the new window)
  useEffect(() => {
    if (tab === "symbol" && symActive) loadSymbol(symActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysForFetch]);

  const rawList = tab === "symbol" ? symNews : tab === "holdings" ? holdNews : marketNews;

  // Compute date window (epoch seconds)
  const dateWindow = useMemo(() => {
    const now = Math.floor(Date.now()/1000);
    const day = 86400;
    if (dateRange === "custom") {
      const f = customFrom ? Math.floor(new Date(customFrom).getTime()/1000) : 0;
      const t = customTo ? Math.floor(new Date(customTo + "T23:59:59").getTime()/1000) : now;
      return {from: f, to: t};
    }
    const span:any = {"24h":1,"3d":3,"7d":7,"14d":14,"30d":30,"all":3650};
    return {from: now - (span[dateRange] || 7) * day, to: now};
  }, [dateRange, customFrom, customTo]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach((n:any) => { if (n.source) set.add(String(n.source).toUpperCase()); });
    return Array.from(set).sort();
  }, [rawList]);

  const filteredList = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const kwTokens = kw ? kw.split(/\s+/).filter(Boolean) : [];

    let res = rawList.filter((n:any) => {
      // Date window
      const ts = n.datetime || 0;
      if (ts && (ts < dateWindow.from || ts > dateWindow.to)) return false;
      // Source
      if (sourceFilter !== "ALL" && String(n.source || "").toUpperCase() !== sourceFilter) return false;
      // Keyword
      if (kwTokens.length) {
        const hay = ((n.headline || "") + " " + (n.summary || "") + " " + (n.source || "") + " " + (n._sym || "")).toLowerCase();
        const hit = kwTokens.every(tok => hay.includes(tok));
        if (!hit) return false;
      }
      return true;
    });

    if (sortMode === "newest") res = [...res].sort((a:any,b:any)=>(b.datetime||0)-(a.datetime||0));
    else if (sortMode === "oldest") res = [...res].sort((a:any,b:any)=>(a.datetime||0)-(b.datetime||0));
    else if (sortMode === "relevance" && kwTokens.length) {
      res = [...res].map((n:any) => {
        const hay = ((n.headline || "") + " " + (n.summary || "")).toLowerCase();
        const score = kwTokens.reduce((s,tok)=>{
          const re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g");
          return s + (hay.match(re)?.length || 0);
        }, 0);
        return {...n, _score: score};
      }).sort((a:any,b:any)=> (b._score - a._score) || ((b.datetime||0)-(a.datetime||0)));
    }
    return res;
  }, [rawList, keyword, dateWindow, sourceFilter, sortMode]);

  const list = filteredList;

  const runSentiment = async () => {
    if (!list.length) return;
    setSentBusy(true); setSentiment("");
    try {
      const headlines = list.slice(0, 12).map((n, i) => `${i+1}. ${n.headline}${n.summary ? " — " + n.summary.slice(0, 140) : ""}`).join("\n");
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL market-analysis assistant. You do NOT provide personalized investment recommendations, buy/sell calls or financial advice under MiFID II.
Analyze the news headlines and produce: overall SENTIMENT (BULLISH/BEARISH/NEUTRAL) as a statistical observation across the titles, 3 quantitative observations with **bold** key terms, and a final BOTTOM LINE line as an educational summary.
ALWAYS end with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."
Max 180 words. Respond in ENGLISH.`;
      const prompt = `Analyze the sentiment of these news headlines (${tab === "symbol" ? "for " + symActive : tab === "holdings" ? "from my portfolio" : "market-wide"}):\n\n${headlines}`;
      const { reply } = await aiChat({ data: { messages: [{role:"user", content: prompt}], system: sys } });
      setSentiment(reply);
    } catch (e:any) {
      setSentiment("AI error: " + e.message);
    } finally { setSentBusy(false); }
  };

  const resetFilters = () => {
    setKeyword(""); setDateRange("7d"); setCustomFrom(""); setCustomTo("");
    setSourceFilter("ALL"); setSortMode("newest");
  };

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (dateRange !== "7d" ? 1 : 0) +
    (sourceFilter !== "ALL" ? 1 : 0) +
    (sortMode !== "newest" ? 1 : 0);

  const inputStyle:any = {
    background:B.bg, border:`1px solid ${B.border}`, color:B.gray1,
    padding:"4px 8px", fontSize:13, fontFamily:"'Courier New',monospace",
    outline:"none", letterSpacing:"0.04em",
  };
  const selectStyle:any = {...inputStyle, color:B.yellow, cursor:"pointer"};

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:2,padding:"3px 4px",borderBottom:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
        {[
          {id:"market", l:"MARKET"},
          {id:"holdings", l:`MY HOLDINGS (${holdings.length})`},
          {id:"symbol", l:"SYMBOL"},
        ].map((t:any) => (
          <FKey key={t.id} label={t.l} active={tab===t.id} onClick={()=>setTab(t.id)}/>
        ))}
      </div>

      {tab === "market" && (
        <div style={{display:"flex",gap:3,padding:"4px 6px",overflowX:"auto",borderBottom:`1px solid ${B.border}`,background:B.panel}}>
          {["general","forex","crypto","merger"].map(c => (
            <button key={c} onClick={()=>setMarketCat(c)} style={{
              background: marketCat===c ? B.blue : B.panel2, border:`1px solid ${marketCat===c?B.blue:B.border}`,
              color: marketCat===c ? B.white : B.gray1, padding:"3px 10px", cursor:"pointer",
              fontFamily:"'Courier New',monospace", fontSize:14, fontWeight:700, letterSpacing:"0.06em",
              whiteSpace:"nowrap", textTransform:"uppercase",
            }}>{c}</button>
          ))}
        </div>
      )}

      {tab === "symbol" && (
        <div style={{padding:"6px",borderBottom:`1px solid ${B.border}`,background:B.panel2,display:"flex",gap:6}}>
          <input data-testid="news-symbol-input" value={symInput} onChange={e=>setSymInput(e.target.value.toUpperCase())}
            onKeyDown={e=>{ if(e.key==="Enter") loadSymbol(symInput.trim()); }}
            placeholder="ENTER TICKER (AAPL, MSFT, NVDA)..."
            style={{flex:1,background:B.bg,border:`1px solid ${B.blue}`,color:B.yellow,
              padding:"6px 10px",fontSize:16,fontFamily:"'Courier New',monospace",outline:"none",
              letterSpacing:"0.04em",textTransform:"uppercase"}}/>
          <button data-testid="news-symbol-fetch-btn" onClick={()=>loadSymbol(symInput.trim())} style={{
            background:B.blue,border:"none",color:B.white,padding:"6px 16px",cursor:"pointer",
            fontFamily:"'Courier New',monospace",fontSize:14,fontWeight:700,letterSpacing:"0.06em"}}>
            ▶ FETCH
          </button>
        </div>
      )}

      {/* FILTER BAR (always visible) */}
      <div style={{padding:"4px 6px",borderBottom:`1px solid ${B.border}`,background:B.panel2,
        display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,flex:"1 1 220px",minWidth:160}}>
          <span style={{color:B.cyan,fontSize:13,fontFamily:"'Courier New',monospace",fontWeight:700}}>🔍</span>
          <input
            data-testid="news-keyword-input"
            value={keyword}
            onChange={e=>setKeyword(e.target.value)}
            placeholder="KEYWORD SEARCH (e.g. earnings, fed, ai)..."
            style={{...inputStyle,flex:1,color:B.yellow,letterSpacing:"0.02em",borderColor:keyword?B.cyan:B.border}}
          />
          {keyword && (
            <button onClick={()=>setKeyword("")} data-testid="news-keyword-clear" style={{
              background:"none",border:"none",color:B.gray2,fontSize:14,cursor:"pointer",
              fontFamily:"'Courier New',monospace",padding:"0 4px",
            }}>✕</button>
          )}
        </div>
        <button onClick={()=>setShowFilters(!showFilters)} data-testid="news-toggle-filters" style={{
          background: showFilters ? B.blue : B.panel, border:`1px solid ${showFilters?B.blue:B.border}`,
          color: showFilters ? B.white : B.gray1, padding:"4px 10px", cursor:"pointer",
          fontFamily:"'Courier New',monospace", fontSize:13, fontWeight:700, letterSpacing:"0.06em",
          whiteSpace:"nowrap",
        }}>
          {showFilters ? "▼" : "▶"} FILTERS{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showFilters && (
        <div style={{padding:"6px",borderBottom:`1px solid ${B.border}`,background:B.panel,
          display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,
            color:B.gray2,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
            DATE
            <select data-testid="news-date-select" value={dateRange} onChange={e=>setDateRange(e.target.value as any)} style={selectStyle}>
              <option value="24h">LAST 24H</option>
              <option value="3d">LAST 3D</option>
              <option value="7d">LAST 7D</option>
              <option value="14d">LAST 14D</option>
              <option value="30d">LAST 30D</option>
              <option value="all">ALL</option>
              <option value="custom">CUSTOM</option>
            </select>
          </label>

          {dateRange === "custom" && (
            <>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,
                color:B.gray2,fontFamily:"'Courier New',monospace"}}>
                FROM
                <input data-testid="news-date-from" type="date" value={customFrom}
                  onChange={e=>setCustomFrom(e.target.value)} style={inputStyle}/>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,
                color:B.gray2,fontFamily:"'Courier New',monospace"}}>
                TO
                <input data-testid="news-date-to" type="date" value={customTo}
                  onChange={e=>setCustomTo(e.target.value)} style={inputStyle}/>
              </label>
            </>
          )}

          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,
            color:B.gray2,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
            SOURCE
            <select data-testid="news-source-select" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">ALL ({allSources.length})</option>
              {allSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,
            color:B.gray2,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
            SORT
            <select data-testid="news-sort-select" value={sortMode} onChange={e=>setSortMode(e.target.value as any)} style={selectStyle}>
              <option value="newest">NEWEST FIRST</option>
              <option value="oldest">OLDEST FIRST</option>
              <option value="relevance" disabled={!keyword.trim()}>RELEVANCE{!keyword.trim() ? " (NEED KEYWORD)" : ""}</option>
            </select>
          </label>

          {activeFilterCount > 0 && (
            <button data-testid="news-reset-filters" onClick={resetFilters} style={{
              background:"transparent", border:`1px solid ${B.red}`, color:B.red,
              padding:"4px 10px", cursor:"pointer", marginLeft:"auto",
              fontFamily:"'Courier New',monospace", fontSize:12, fontWeight:700, letterSpacing:"0.06em",
            }}>
              ✕ RESET
            </button>
          )}
        </div>
      )}

      <div style={{padding:"4px 6px",borderBottom:`1px solid ${B.border}`,background:B.panel,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:14,color:B.gray2,fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>
          {tab === "symbol" && symActive ? `${symActive} — ` : ""}
          <span style={{color:B.yellow,fontWeight:700}}>{list.length}</span>
          {rawList.length !== list.length ? <span style={{color:B.gray3}}> / {rawList.length}</span> : ""} HEADLINES
        </span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button data-testid="news-refresh-btn" onClick={()=>{
            if (tab === "market") loadMarket(marketCat);
            else if (tab === "holdings") loadHoldings();
            else if (tab === "symbol" && symActive) loadSymbol(symActive);
          }} disabled={loading} style={{
            background:"transparent", border:`1px solid ${B.gray3}`, color:B.gray1,
            padding:"3px 10px", cursor:loading?"wait":"pointer",
            fontFamily:"'Courier New',monospace", fontSize:14, fontWeight:700, letterSpacing:"0.06em",
            opacity: loading ? 0.5 : 1,
          }}>
            {loading ? "..." : "↻ REFRESH"}
          </button>
          <button data-testid="news-ai-sentiment-btn" onClick={runSentiment} disabled={sentBusy || !list.length} style={{
            background:"transparent", border:`1px solid ${B.cyan}`, color:B.cyan,
            padding:"3px 10px", cursor:list.length?"pointer":"not-allowed",
            fontFamily:"'Courier New',monospace", fontSize:14, fontWeight:700, letterSpacing:"0.06em",
            opacity: list.length ? 1 : 0.4,
          }}>
            {sentBusy ? "ANALYZING..." : "✦ AI SENTIMENT"}
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {sentiment && (
          <div style={{padding:"8px 10px",borderBottom:`1px solid ${B.cyan}`,background:"#001a1a"}}>
            <div style={{fontSize:14,color:B.cyan,fontFamily:"'Courier New',monospace",fontWeight:700,marginBottom:4,letterSpacing:"0.08em"}}>
              ✦ STRATEGIC MARKETS AI SENTIMENT
            </div>
            {sentiment.split("\n").map((line, i) => {
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={i} style={{fontSize:14,color:B.gray1,fontFamily:"'Courier New',monospace",lineHeight:1.5,marginBottom:2}}>
                  {parts.map((p, j) =>
                    p.startsWith("**") && p.endsWith("**")
                      ? <span key={j} style={{color:B.yellow,fontWeight:700}}>{p.slice(2,-2)}</span>
                      : p
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && <Spinner text="FETCHING NEWS..."/>}

        {!loading && rawList.length > 0 && list.length === 0 && (
          <div style={{padding:"14px 10px",fontSize:14,color:B.yellow,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
            ⚠ NO HEADLINES MATCH YOUR FILTERS
            <div style={{fontSize:12,color:B.gray3,marginTop:6}}>
              Try adjusting keyword, date range or source.
            </div>
          </div>
        )}

        {!loading && rawList.length === 0 && (
          <div style={{padding:"14px 10px",fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
            {tab === "symbol" ? "ENTER A TICKER ABOVE TO LOAD COMPANY NEWS" :
             tab === "holdings" ? "NO HOLDINGS YET — ADD SECURITIES VIA SEARCH" :
             "NO NEWS AVAILABLE"}
          </div>
        )}

        {list.map((n:any, i:number) => {
          const dt = new Date((n.datetime || 0) * 1000);
          const dateStr = dt.toLocaleString("en-US", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false });
          const kwTokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
          return (
            <a key={(n.id || i) + "_" + i} href={n.url && n.url !== "#" ? n.url : undefined}
               target="_blank" rel="noreferrer noopener" data-testid="news-headline-item"
               style={{display:"block",textDecoration:"none",padding:"6px 10px",
                       borderBottom:`1px solid ${B.border}`,cursor:n.url && n.url !== "#" ? "pointer" : "default"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                {n._sym && <span style={{fontSize:14,color:B.blue,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{n._sym}</span>}
                <span style={{fontSize:12,color:B.cyan,fontFamily:"'Courier New',monospace"}}>{dateStr}</span>
                {n.source && <span style={{fontSize:12,color:B.gray3,fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>· {n.source}</span>}
                {n.category && <span style={{fontSize:11,color:B.gray3,fontFamily:"'Courier New',monospace",border:`1px solid ${B.gray4}`,padding:"0 4px",textTransform:"uppercase",marginLeft:"auto"}}>{n.category}</span>}
              </div>
              <div style={{fontSize:16,color:B.gray1,fontFamily:"'Courier New',monospace",fontWeight:700,marginBottom:2,lineHeight:1.3}}>
                {highlightKeyword(n.headline, kwTokens)}
              </div>
              {n.summary && (
                <div style={{fontSize:13,color:B.gray2,fontFamily:"'Courier New',monospace",lineHeight:1.4,
                             overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                  {highlightKeyword(n.summary, kwTokens)}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function highlightKeyword(text:string, tokens:string[]) {
  if (!text) return text;
  if (!tokens || tokens.length === 0) return text;
  const escaped = tokens.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).filter(Boolean);
  if (escaped.length === 0) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "ig");
  const parts = text.split(re);
  return parts.map((p,i) =>
    re.test(p)
      ? <mark key={i} style={{background:"#FFFF0033",color:B.yellow,padding:"0 2px"}}>{p}</mark>
      : <span key={i}>{p}</span>
  );
}

export default function PortfolioTerminal() {
  const [page,setPage]     = useState("home");
  const [holdings,setHoldings] = useState<any[]>([]);
  const [refreshing,setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ── PERSISTENCE ─────────────────────────────────────────────────────────
  // Hydrate from localStorage on mount (client only). This survives HMR,
  // navigation away/back, hard reloads, route invalidations, etc.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("moneta_holdings_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHoldings(parsed);
      }
      const p = localStorage.getItem("moneta_page_v1");
      if (p && ["home","search","portfolio","analysis","ai","news"].includes(p)) setPage(p);
    } catch (e) {
      console.warn("[Strategic Markets] hydration error:", e);
    } finally {
      setHydrated(true);
    }
    // Diagnostic: log mount/unmount in dev so we can spot accidental remounts.
    const id = Math.random().toString(36).slice(2, 8);
    // eslint-disable-next-line no-console
    console.info("[Strategic Markets] PortfolioTerminal MOUNT", id);
    return () => {
      // eslint-disable-next-line no-console
      console.info("[Strategic Markets] PortfolioTerminal UNMOUNT", id);
    };
  }, []);

  // Persist holdings whenever they change (after first hydration).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem("moneta_holdings_v1", JSON.stringify(holdings));
    } catch (e) {
      console.warn("[Strategic Markets] persist holdings error:", e);
    }
  }, [holdings, hydrated]);

  // Persist active page so even a hard reload puts the user back where they were.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try { localStorage.setItem("moneta_page_v1", page); } catch {}
  }, [page, hydrated]);

  // Ref keeps the latest holdings without invalidating callbacks/intervals
  const holdingsRef = useRef<any[]>(holdings);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

  const addToPortfolio = useCallback((asset:any, qty:number, costPrice?:number, buyDate?:string) => {
    setHoldings(prev => {
      const key = asset.ticker || asset.symbol;
      const idx = prev.findIndex(h => h.asset.ticker===key || h.asset.symbol===key);
      const cp = costPrice ?? asset.price ?? 0;
      const bd = buyDate || new Date().toISOString().slice(0,10);
      const value = qty * (asset.price ?? cp);
      const cost  = qty * cp;
      if (idx>=0) {
        const n=[...prev];
        const oldQty  = n[idx].qty;
        const oldCost = (n[idx].costBasis ?? (n[idx].costPrice||0)*oldQty);
        const newQty  = oldQty + qty;
        const newCost = oldCost + cost;
        const lots    = [...(n[idx].lots||[{qty:oldQty,price:n[idx].costPrice??0,date:n[idx].buyDate||bd}]),
                         {qty,price:cp,date:bd}];
        n[idx]={...n[idx],
          qty:newQty,
          value:n[idx].value+value,
          costBasis:newCost,
          costPrice:newCost/newQty,
          buyDate:lots[0].date,
          lots};
        return n;
      }
      return [...prev, {isin:asset.isin||key, asset, qty, value,
        costPrice:cp, costBasis:cost, buyDate:bd,
        lots:[{qty,price:cp,date:bd}]}];
    });
  }, []);

  const removeFromPortfolio = useCallback((key:string) =>
    setHoldings(h => h.filter(x => x.isin!==key && x.asset.ticker!==key)), []);

  // Stable callback — no holdings dep, reads from ref. Won't recreate on each price tick.
  const refreshPrices = useCallback(async () => {
    const cur = holdingsRef.current;
    if (!cur.length) return;
    setRefreshing(true);
    try {
      const symbols = cur.map((h:any) => h.asset.ticker);
      const data    = await batchRefresh(symbols);
      const bySymbol = Object.fromEntries(data.map((d:any)=>[d.symbol,d]));
      setHoldings(prev => prev.map(h => {
        const live = bySymbol[h.asset.ticker];
        if (!live) return h;
        const newAsset = {...h.asset,
          price:        live.price ?? h.asset.price,
          dayChangePct: live.dayChangePct ?? h.asset.dayChangePct,
          ytd:          live.ytd ?? h.asset.ytd,
          vol:          live.vol ?? h.asset.vol,
        };
        return {...h, asset:newAsset, value: h.qty * (live.price ?? h.asset.price)};
      }));
    } catch(e:any) {
      console.error("Refresh failed:", e.message);
    } finally { setRefreshing(false); }
  }, []);

  // Single interval that does NOT reset on every price tick — only when
  // crossing the empty/non-empty boundary of holdings.
  const hasHoldings = holdings.length > 0;
  useEffect(() => {
    if (!hasHoldings) return;
    const t = setInterval(refreshPrices, 60000);
    return () => clearInterval(t);
  }, [hasHoldings, refreshPrices]);

  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  useEffect(() => {
    try {
      const accepted = typeof window !== "undefined" && localStorage.getItem("moneta_disclaimer_v1");
      if (!accepted) setShowDisclaimerModal(true);
    } catch {}
  }, []);
  const acceptDisclaimer = () => {
    try { localStorage.setItem("moneta_disclaimer_v1", new Date().toISOString()); } catch {}
    setShowDisclaimerModal(false);
  };

  return (
    <PhoneShell>
      {(time:string) => (
        <>
          <TopBar time={time}/>
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {page==="home"       && <HomePage     holdings={holdings} setPage={setPage} onRefresh={refreshPrices} refreshing={refreshing}/>}
            {page==="search"     && <SearchPage   onAdd={addToPortfolio} portfolio={holdings}/>}
            {page==="portfolio"  && <PortfolioPage holdings={holdings} onRemove={removeFromPortfolio}/>}
            {page==="analysis"   && <AnalysisPage  holdings={holdings}/>}
            {page==="ai"         && <AIAdvisorPage holdings={holdings}/>}
            {page==="news"       && <NewsPage holdings={holdings} setPage={setPage}/>}
          </div>
          <DisclaimerBar/>
          <BottomNav page={page} setPage={setPage} badge={holdings.length}/>
          {showDisclaimerModal && <DisclaimerModal onAccept={acceptDisclaimer}/>}
        </>
      )}
    </PhoneShell>
  );
}

function DisclaimerBar() {
  return (
    <div data-testid="disclaimer-bar" style={{
      background:"#1a0f00", borderTop:`1px solid ${B.yellow}`, borderBottom:`1px solid ${B.border}`,
      padding:"3px 8px", display:"flex", alignItems:"center", gap:6,
      fontFamily:"'Courier New',monospace", fontSize:11, color:B.yellow, lineHeight:1.2,
    }}>
      <span style={{fontWeight:700,letterSpacing:"0.06em"}}>⚠ EDU/INFO ONLY</span>
      <span style={{color:B.gray2,letterSpacing:"0.02em"}}>
        Not investment advice (MiFID II/SEC).
      </span>
      <Link to="/disclaimer" style={{color:B.cyan,textDecoration:"underline",marginLeft:"auto",whiteSpace:"nowrap"}}>
        FULL TERMS →
      </Link>
    </div>
  );
}

function DisclaimerModal({onAccept}:{onAccept:()=>void}) {
  return (
    <div data-testid="disclaimer-modal" style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      fontFamily:"'Courier New',monospace",
    }}>
      <div style={{
        maxWidth:560, width:"100%", background:B.bg, border:`2px solid ${B.yellow}`,
        boxShadow:`0 0 0 4px ${B.bg}, 0 0 0 5px ${B.yellow}`,
      }}>
        <div style={{background:B.yellow,padding:"6px 10px",color:"#000",fontWeight:700,
          fontSize:16,letterSpacing:"0.1em"}}>
          ⚠ STRATEGIC MARKETS — REGULATORY NOTICE
        </div>
        <div style={{padding:"14px 16px",color:B.gray1,fontSize:14,lineHeight:1.55}}>
          <div style={{color:B.yellow,fontWeight:700,marginBottom:6,letterSpacing:"0.05em"}}>
            ▸ NOT FINANCIAL ADVICE
          </div>
          <p style={{margin:"0 0 10px 0"}}>
            Strategic Markets is an <b style={{color:B.cyan}}>educational and informational
            analytics terminal</b>. Market data, portfolio simulations, risk
            metrics and AI-generated analyses are provided <b>solely for
            educational purposes</b> and do not constitute — and must not be
            interpreted as — investment advice under <b>MiFID II</b>,
            <b> SEC</b> or <b>ESMA</b> regulations.
          </p>
          <p style={{margin:"0 0 10px 0"}}>
            Strategic Markets's AI produces <b>hypothetical scenarios</b> and
            <b> quantitative observations</b>;
            <b> it does not provide personalized recommendations</b> to buy,
            sell or hold any financial instrument. Past performance is not
            indicative of future results. Every investment decision is the
            sole responsibility of the user, who is encouraged to consult a
            licensed financial advisor.
          </p>
          <p style={{margin:"0 0 12px 0",color:B.gray2,fontSize:13}}>
            By clicking "ACCEPT" you confirm that you have read and understood this notice.
          </p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onAccept} data-testid="disclaimer-accept-btn" style={{
              flex:1,background:B.blue,border:"none",color:B.white,padding:"10px",
              fontFamily:"'Courier New',monospace",fontSize:16,fontWeight:700,
              letterSpacing:"0.1em",cursor:"pointer",
            }}>
              ACCEPT &amp; CONTINUE
            </button>
            <Link to="/disclaimer" style={{
              background:"transparent",border:`1px solid ${B.gray3}`,color:B.gray1,
              padding:"10px 14px",fontFamily:"'Courier New',monospace",fontSize:14,
              letterSpacing:"0.08em",cursor:"pointer",textDecoration:"none",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              READ FULL TERMS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
