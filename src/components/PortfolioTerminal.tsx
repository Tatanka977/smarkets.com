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
import { Link } from "@tanstack/react-router";

const B = {
  bg:      "#000000",
  panel:   "#0A0A0A",
  panel2:  "#111111",
  border:  "#2A2A2A",
  borderB: "#333333",
  blue:    "#0066FF",
  blueL:   "#3388FF",
  blueD:   "#0044CC",
  white:   "#FFFFFF",
  yellow:  "#FFFF00",
  green:   "#00FF00",
  red:     "#FF3333",
  cyan:    "#00FFFF",
  gray1:   "#CCCCCC",
  gray2:   "#888888",
  gray3:   "#555555",
  gray4:   "#333333",
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
  const sharpe= wVol>0 ? (wRet-2.5)/wVol : 0;
  const sectors = new Set(hs.map(h=>h.asset.sector||"N/A")).size;
  const geos    = new Set(hs.map(h=>h.asset.geo||"N/A")).size;
  const hhi     = hs.reduce((s,h)=>s+Math.pow(h.value/total*100,2),0);
  return {total,wRet,wVol,wBeta,wDiv,sharpe,sectors,geos,hhi};
};

const searchSecurities = (q, category) => srvSearch({ data: { q, category } });
const fetchQuote = (sym) => srvQuote({ data: { symbol: sym } });
const batchRefresh = (symbols) => srvBatch({ data: { symbols } });
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
    borderRadius:0, padding:"4px 8px", cursor:"pointer",
    display:"flex", alignItems:"center", gap:0,
    fontFamily:"'Courier New',Courier,monospace", minWidth:60,
  }}>
    {num&&<span style={{fontSize:18,color:active?B.white:B.gray2,fontWeight:700,marginRight:4}}>{num}</span>}
    <span style={{fontSize:18,color:active?B.white:B.gray2,fontWeight:700,
      letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
  </button>
);

const BPanel = ({title,children,style,accent}:any) => (
  <div style={{border:`1px solid ${accent?B.blue:B.border}`,background:B.panel,...style}}>
    {title&&(
      <div style={{background:accent?B.blue:B.blue,padding:"3px 8px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:18,fontWeight:700,color:B.white,
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
    <div style={{background:B.bg,minHeight:"100vh",display:"flex",flexDirection:"column",
      fontFamily:"'Courier New',Courier,monospace"}}>
      {children(time)}
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        html, body, #root { background:${B.bg}; margin:0; padding:0; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; background:#000; }
        ::-webkit-scrollbar-thumb { background:${B.blue}; }
      `}</style>
    </div>
  );
}

function TopBar({time}:any) {
  const { user } = useUser();
  return (
    <div style={{background:B.blue,display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"4px 10px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",letterSpacing:"0.18em"}}>MONETA</span>
        <span style={{fontSize:18,color:"rgba(255,255,255,0.85)",fontFamily:"'Courier New',monospace"}}>PORTFOLIO TERMINAL</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:24,color:B.yellow,fontFamily:"'Courier New',monospace",fontWeight:700}}>● LIVE</span>
        <span style={{fontSize:18,color:B.white,fontFamily:"'Courier New',monospace"}}>{time}</span>
        <Link to={user ? "/profile" : "/auth"} style={{
          fontSize:24,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",
          textDecoration:"none",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.4)",
          padding:"3px 8px",letterSpacing:"0.06em"}}>
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
    <div style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,
      display:"flex",alignItems:"stretch",padding:"3px 4px",gap:3,flexShrink:0}}>
      {keys.map(k=>(
        <FKey key={k.id} label={k.l} active={page===k.id} onClick={()=>setPage(k.id)}/>
      ))}
      <div style={{flex:1}}/>
      <span style={{fontSize:24,color:B.gray3,fontFamily:"'Courier New',monospace",
        alignSelf:"center",paddingRight:4}}>HELP</span>
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
    <div style={{background:B.panel2,borderTop:`1px solid ${B.borderB}`,
      display:"flex",paddingBottom:20,flexShrink:0}}>
      {tabs.map(t=>{
        const active=page===t.id;
        return (
          <button key={t.id} onClick={()=>setPage(t.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",
            padding:"8px 0 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:1,
            borderTop:`2px solid ${active?B.blue:"transparent"}`,position:"relative"}}>
            {t.badge>0&&<div style={{position:"absolute",top:3,right:"18%",
              background:B.blue,color:B.white,fontSize:24,fontWeight:700,
              fontFamily:"'Courier New',monospace",padding:"0 5px",lineHeight:"16px"}}>{t.badge}</div>}
            <span style={{fontSize:24,color:active?B.blue:B.gray2,fontWeight:700,
              fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>{t.label}</span>
          </button>
        );
      })}
    </div>
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
      setSaveMsg("✓ SALVATO");
    } catch(e:any){ setSaveMsg("ERRORE: "+e.message); }
    finally { setSaving(false); setTimeout(()=>setSaveMsg(""),2000); }
  };


  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:4}}>
      <BPanel title="PORTFOLIO OVERVIEW  LIVE DATA">
        <div style={{padding:"6px 8px"}}>
          {!m?(
            <div style={{padding:"12px 0",textAlign:"center"}}>
              <div style={{fontSize:18,color:B.gray2,fontFamily:"'Courier New',monospace",marginBottom:8}}>NO ACTIVE PORTFOLIO</div>
              <div style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:12}}>
                USE SEARCH TO FIND SECURITIES BY ISIN OR TICKER
              </div>
              <button onClick={()=>setPage("search")} style={{
                background:B.blue,border:"none",color:B.white,
                padding:"6px 20px",cursor:"pointer",
                fontFamily:"'Courier New',monospace",fontSize:24,fontWeight:700,letterSpacing:"0.08em"}}>
                {"> SEARCH SECURITIES"}
              </button>
            </div>
          ):(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
                <div style={{borderLeft:`3px solid ${B.blue}`,paddingLeft:6}}>
                  <div style={{fontSize:14,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>TOTAL MKT VALUE</div>
                  <div style={{fontSize:32,color:B.yellow,fontWeight:700,letterSpacing:"-0.02em"}}>${fmtM(m.total)}</div>
                </div>
                <div style={{borderLeft:`3px solid ${pCol(m.wRet)}`,paddingLeft:6}}>
                  <div style={{fontSize:14,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>PORT EXP RETURN</div>
                  <div style={{fontSize:32,color:pCol(m.wRet),fontWeight:700}}>{pSign(fmt(m.wRet,1))}%</div>
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
                    <div style={{fontSize:22,color:B.gray3,textTransform:"uppercase",marginBottom:1}}>{k.l}</div>
                    <div style={{fontSize:22,color:k.col,fontWeight:700}}>{k.v}</div>
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
              <span style={{fontSize:24,color:B.blue,fontWeight:700,minWidth:52}}>{h.asset.ticker}</span>
              <span style={{fontSize:24,color:B.yellow,minWidth:70}}>{h.asset.price!=null?h.asset.price.toLocaleString(undefined,{maximumFractionDigits:2}):"---"}</span>
              <span style={{fontSize:24,color:pCol(h.asset.dayChangePct),minWidth:50,fontWeight:700}}>
                {h.asset.dayChangePct!=null?`${pSign(fmt(h.asset.dayChangePct,2))}%`:"---"}
              </span>
              <span style={{fontSize:15,color:B.gray2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.asset.shortName||h.asset.ticker}</span>
            </div>
          ))}
        </BPanel>
      )}

      <div style={{padding:"4px",background:B.panel2,marginTop:1,
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
        {[
          {l:"SEARCH SECURITIES",action:()=>setPage("search")},
          {l:"PORTFOLIO",         action:()=>setPage("portfolio")},
          {l:"RISK ANALYSIS",     action:()=>setPage("analysis")},
          {l:"AI ADVISOR",        action:()=>setPage("ai")},
          {l:"MARKET NEWS",       action:()=>setPage("news")},
        ].map((b,i)=>(
          <button key={i} onClick={b.action} style={{
            background:B.panel2,border:`1px solid ${B.border}`,
            padding:"8px 10px",cursor:"pointer",textAlign:"left",
            display:"flex",alignItems:"center",gap:6,fontFamily:"'Courier New',monospace"}}>
            <span style={{fontSize:15,color:B.gray1,textTransform:"uppercase",letterSpacing:"0.05em"}}>{b.l}</span>
            <span style={{marginLeft:"auto",fontSize:15,color:B.gray3}}>{">"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchPage({onAdd,portfolio}:any) {
  const [q,setQ]         = useState("");
  const [results,setRes] = useState<any[]>([]);
  const [searching,setSrch]=useState(false);
  const [sel,setSel]     = useState<any>(null);
  const [loading,setLoad]= useState(false);
  const [detail,setDetail]=useState<any>(null);
  const [error,setError] = useState("");
  const [qty,setQty]     = useState("1");
  const [buyPx,setBuyPx] = useState("");
  const [buyDt,setBuyDt] = useState(()=>new Date().toISOString().slice(0,10));
  const [cat,setCat]     = useState<any>(undefined);
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
          <span style={{fontSize:18,color:B.white,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{detail.ticker}</span>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.7)",marginLeft:6,fontFamily:"'Courier New',monospace"}}>{detail.exchange}</span>
        </div>
        <button onClick={()=>{setSel(null);setDetail(null);}} style={{background:"none",border:"none",color:B.white,cursor:"pointer",fontSize:24,fontFamily:"'Courier New',monospace"}}>X CLOSE</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80,padding:8}}>
        <div style={{fontSize:24,color:B.gray1,fontFamily:"'Courier New',monospace",marginBottom:8}}>{detail.shortName}</div>
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
              <div style={{fontSize:22,color:B.gray3,fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>{k.l}</div>
              <div style={{fontSize:32,color:k.col,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{k.v}</div>
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
                  padding:"4px 6px",fontSize:18,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>BUY PRICE</div>
              <input value={buyPx} onChange={e=>setBuyPx(e.target.value)} type="number" min="0" step="any"
                placeholder={detail.price!=null?detail.price.toFixed(2):""}
                style={{width:"100%",background:B.bg,border:`1px solid ${B.border}`,color:B.yellow,
                  padding:"4px 6px",fontSize:18,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>PURCHASE DATE</div>
              <input value={buyDt} onChange={e=>setBuyDt(e.target.value)} type="date"
                style={{width:"100%",background:B.bg,border:`1px solid ${B.border}`,color:B.cyan,
                  padding:"4px 6px",fontSize:18,fontFamily:"'Courier New',monospace",outline:"none"}}/>
            </div>
          </div>
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
            fontSize:24,fontWeight:700,letterSpacing:"0.08em"}}>
            ADD POSITION
          </button>
          <button onClick={addWatch} disabled={watchBusy} style={{
            width:"100%",marginTop:6,background:"transparent",border:`1px solid ${B.yellow}`,color:B.yellow,
            padding:"6px",cursor:watchBusy?"wait":"pointer",fontFamily:"'Courier New',monospace",
            fontSize:18,fontWeight:700,letterSpacing:"0.08em"}}>
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
            padding:"8px 10px",fontSize:22,fontFamily:"'Courier New',monospace",outline:"none",
            letterSpacing:"0.04em",textTransform:"uppercase"}}/>
        <div style={{display:"flex",gap:3,marginTop:6,overflowX:"auto",paddingBottom:2}}>
          {CATEGORY_TABS.map(c=>{
            const active=cat===c.id;
            return (
              <button key={c.label} onClick={()=>setCat(c.id)} style={{
                background:active?B.blue:B.panel,border:`1px solid ${active?B.blue:B.border}`,
                color:active?B.white:B.gray1,padding:"4px 10px",cursor:"pointer",
                fontFamily:"'Courier New',monospace",fontSize:18,fontWeight:700,
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
              <span style={{fontSize:22,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>
                {r.symbol}{added?" ✓":""}
              </span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:32,color:B.gray1,fontFamily:"'Courier New',monospace",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.shortName}</div>
                <div style={{fontSize:24,color:B.gray3,fontFamily:"'Courier New',monospace"}}>{r.exchange}</div>
              </div>
              <span style={{fontSize:24,color:B.yellow,fontFamily:"'Courier New',monospace",
                textAlign:"right",fontWeight:700}}>{r.category||r.type}</span>
            </div>
          );
        })}
        {!searching&&q.trim()&&results.length===0&&(
          <div style={{padding:"14px 10px",fontSize:18,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
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
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.blue,display:"grid",gridTemplateColumns:"repeat(4,1fr)",flexShrink:0}}>
        {[
          {l:"PORT VALUE",v:`$${fmtM(m.total)}`},
          {l:"EXP RET",   v:`${pSign(fmt(m.wRet,1))}%`},
          {l:"VOLATILITY",v:`${fmt(m.wVol,1)}%`},
          {l:"SHARPE",    v:fmt(m.sharpe,2)},
        ].map((k,i)=>(
          <div key={i} style={{padding:"3px 6px",borderRight:i<3?`1px solid rgba(255,255,255,0.2)`:"none"}}>
            <div style={{fontSize:22,color:"rgba(255,255,255,0.65)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{k.l}</div>
            <div style={{fontSize:18,color:B.white,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
        padding:"2px 6px",background:B.panel2,borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
        {["TICKER","NAME","VALUE","WT%","DAY%",""].map((h,i)=>(
          <span key={i} style={{fontSize:22,color:B.gray3,fontFamily:"'Courier New',monospace",
            fontWeight:700,letterSpacing:"0.08em",textAlign:i>1?"right":"left"}}>{h}</span>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {holdings.map((h,i)=>{
          const w=(h.value/m.total*100).toFixed(1);
          const cb = h.costBasis ?? (h.costPrice!=null ? h.costPrice*h.qty : null);
          const pl = cb!=null ? h.value - cb : null;
          const plPct = (cb!=null && cb>0) ? (pl/cb*100) : null;
          return (
            <div key={h.isin||h.asset.ticker} style={{borderBottom:`1px solid ${B.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
                padding:"5px 6px",gap:0,alignItems:"center"}}>
                <span style={{fontSize:24,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>{h.asset.ticker}</span>
                <span style={{fontSize:14,color:B.gray2,fontFamily:"'Courier New',monospace",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:4}}>
                  {(h.asset.shortName||h.asset.name||"").slice(0,20)}
                </span>
                <span style={{fontSize:15,color:B.yellow,fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
                  ${fmtM(h.value)}
                </span>
                <span style={{fontSize:15,color:B.cyan,fontFamily:"'Courier New',monospace",textAlign:"right"}}>{w}%</span>
                <span style={{fontSize:15,color:pCol(h.asset.dayChangePct),fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
                  {h.asset.dayChangePct!=null?`${pSign(fmt(h.asset.dayChangePct,2))}%`:"---"}
                </span>
                <button onClick={()=>onRemove(h.isin||h.asset.ticker)} style={{
                  background:"none",border:"none",color:B.gray3,cursor:"pointer",
                  fontSize:24,fontFamily:"'Courier New',monospace",textAlign:"right"}}>X</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"0 6px 4px",
                fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace"}}>
                <span>QTY <span style={{color:B.gray1}}>{fmt(h.qty,4)}</span></span>
                {h.costPrice!=null && <span>BUY <span style={{color:B.gray1}}>${fmt(h.costPrice,2)}</span></span>}
                {h.buyDate && <span>DATE <span style={{color:B.cyan}}>{h.buyDate}</span></span>}
                {cb!=null && <span>COST <span style={{color:B.gray1}}>${fmtM(cb)}</span></span>}
                {pl!=null && (
                  <span>P&L <span style={{color:pCol(pl),fontWeight:700}}>
                    {pl>=0?"+":""}${fmtM(Math.abs(pl))} ({pSign(fmt(plPct!,2))}%)
                  </span></span>
                )}
              </div>
              <div style={{height:2,background:B.panel2}}>
                <div style={{height:"100%",width:`${w}%`,background:SERIES_COLS[i%SERIES_COLS.length]}}/>
              </div>
            </div>
          );
        })}
        <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
          padding:"5px 6px",background:B.panel2,borderTop:`1px solid ${B.blue}`}}>
          <span style={{fontSize:14,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>TOTAL</span>
          <span/><span/>
          <span style={{fontSize:15,color:B.yellow,fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
            ${fmtM(m.total)}
          </span>
          <span/>
        </div>
      </div>
    </div>
  );
}

function AnalysisPage({holdings}:any) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  const [sub,setSub]=useState("alloc");
  if (!holdings.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:15,color:B.gray3,fontFamily:"'Courier New',monospace"}}>NO DATA — ADD SECURITIES VIA SEARCH</span>
    </div>
  );
  const sD=groupBy(holdings,"sector",m.total);
  const gD=groupBy(holdings,"geo",m.total);
  const tD=groupBy(holdings,"type",m.total);
  const radarData=[
    {s:"RETURN",v:Math.min(100,m.wRet/18*100)},
    {s:"DIVERS",v:Math.min(100,m.sectors/8*100)},
    {s:"GEO",   v:Math.min(100,m.geos/5*100)},
    {s:"STAB",  v:Math.max(0,100-m.wVol*2)},
    {s:"LIQ",   v:holdings.filter(h=>h.asset.type?.includes("ETF")||h.asset.type?.includes("BOND")).length/holdings.length*100},
    {s:"CCY",   v:Math.min(100,new Set(holdings.map(h=>h.asset.currency||h.asset.ccy||"USD")).size/4*100)},
  ];
  const score=Math.round(radarData.reduce((s,d)=>s+d.v,0)/radarData.length);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:2,padding:"3px 4px",borderBottom:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
        {[{id:"alloc",l:"ALLOCATION"},{id:"risk",l:"RISK"},{id:"perf",l:"PERFORMANCE"}].map(t=>(
          <FKey key={t.id} label={t.l} active={sub===t.id} onClick={()=>setSub(t.id)}/>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {sub==="alloc"&&(
          <div>
            {[{data:sD,t:"SECTOR BREAKDOWN"},{data:gD,t:"GEOGRAPHIC BREAKDOWN"},{data:tD,t:"ASSET CLASS"}].map(({data,t})=>(
              <BPanel key={t} title={t} style={{marginBottom:1}}>
                <div style={{padding:"4px 8px 6px"}}>
                  <div style={{display:"flex",gap:0,alignItems:"center"}}>
                    <ResponsiveContainer width={90} height={90}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={42} paddingAngle={1} dataKey="value" strokeWidth={0}>
                          {data.map((_,i)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{flex:1,paddingLeft:6}}>
                      {data.slice(0,5).map((d,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                          <div style={{width:6,height:6,background:PIE_COLS[i%PIE_COLS.length],flexShrink:0}}/>
                          <span style={{fontSize:14,color:B.gray1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"}}>{d.name}</span>
                          <span style={{fontSize:14,color:B.yellow,fontFamily:"'Courier New',monospace",flexShrink:0}}>{d.pct}%</span>
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
            <BPanel title="RISK PROFILE  RADAR">
              <div style={{padding:"4px"}}>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={B.border}/>
                    <PolarAngleAxis dataKey="s" tick={{fill:B.gray2,fontSize:15,fontFamily:"'Courier New',monospace"}}/>
                    <Radar dataKey="v" stroke={B.blue} fill={B.blue} fillOpacity={0.35}/>
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{textAlign:"center",marginTop:4}}>
                  <div style={{fontSize:32,color:score>70?B.green:score>40?B.yellow:B.red,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{score}/100</div>
                  <div style={{fontSize:14,color:B.gray2,fontFamily:"'Courier New',monospace"}}>PORT SCORE</div>
                </div>
              </div>
            </BPanel>
            <BPanel title="VALUE AT RISK  RISK METRICS" style={{marginTop:1}}>
              <div style={{padding:"4px 8px"}}>
                {[
                  {l:"VAR 95% (1-DAY)",  v:`-${fmt(m.wVol/Math.sqrt(252)*1.645,2)}%`,col:B.yellow},
                  {l:"VAR 99% (1-DAY)",  v:`-${fmt(m.wVol/Math.sqrt(252)*2.326,2)}%`,col:B.red},
                  {l:"MAX DRAWDOWN EST", v:`-${fmt(m.wVol*2.5,1)}%`,                 col:B.red},
                  {l:"SHARPE RATIO",     v:fmt(m.sharpe,2),                          col:m.sharpe>0.6?B.green:m.sharpe>0.3?B.yellow:B.red},
                  {l:"HHI CONC INDEX",   v:fmt(m.hhi,0),                             col:m.hhi>3000?B.red:m.hhi>1500?B.yellow:B.green},
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",
                    borderBottom:i<4?`1px solid ${B.border}`:"none"}}>
                    <span style={{fontSize:14,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{r.l}</span>
                    <span style={{fontSize:18,color:r.col,fontFamily:"'Courier New',monospace",fontWeight:700}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </BPanel>
          </div>
        )}
        {sub==="perf"&&(
          <div>
            <BPanel title="RETURN vs VOLATILITY">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={holdings.map(h=>({n:h.asset.ticker,r:+(h.asset.ytd??0).toFixed(1),v:+(h.asset.vol??0).toFixed(1)}))}>
                  <CartesianGrid strokeDasharray="1 1" stroke={B.border}/>
                  <XAxis dataKey="n" tick={{fill:B.gray3,fontSize:14,fontFamily:"'Courier New',monospace"}}/>
                  <YAxis tick={{fill:B.gray3,fontSize:14,fontFamily:"'Courier New',monospace"}}/>
                  <Tooltip contentStyle={TT_STYLE}/>
                  <Bar dataKey="r" name="YTD %" fill={B.blue} maxBarSize={16}/>
                  <Bar dataKey="v" name="VOL %" fill={B.red}  maxBarSize={16}/>
                </BarChart>
              </ResponsiveContainer>
            </BPanel>
            <BPanel title="YTD PERFORMANCE RANKING" style={{marginTop:1}}>
              {[...holdings].sort((a,b)=>(b.asset.ytd??0)-(a.asset.ytd??0)).map((h)=>(
                <div key={h.isin||h.asset.ticker} style={{display:"flex",alignItems:"center",gap:6,
                  padding:"4px 8px",borderBottom:`1px solid ${B.border}`}}>
                  <span style={{fontSize:15,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700,minWidth:44}}>{h.asset.ticker}</span>
                  <div style={{flex:1,height:3,background:B.panel2,position:"relative"}}>
                    <div style={{position:"absolute",top:0,height:"100%",
                      left:(h.asset.ytd??0)<0?`${Math.max(0,50-Math.abs(h.asset.ytd??0)/3)}%`:"50%",
                      width:`${Math.min(50,Math.abs(h.asset.ytd??0)/3)}%`,
                      background:pCol(h.asset.ytd)}}/>
                    <div style={{position:"absolute",top:-1,left:"50%",width:1,height:5,background:B.border}}/>
                  </div>
                  <span style={{fontSize:15,color:pCol(h.asset.ytd),fontFamily:"'Courier New',monospace",fontWeight:700,minWidth:48,textAlign:"right"}}>
                    {pSign(fmt(h.asset.ytd,2))}%
                  </span>
                </div>
              ))}
            </BPanel>
          </div>
        )}
      </div>
    </div>
  );
}

const SYS_PROMPT=`You are MONETA AI, an EDUCATIONAL financial-markets terminal assistant.

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
  const [msgs,setMsgs]=useState<any[]>([{role:"assistant",content:"**MONETA AI TERMINAL ONLINE**\n\nThis is an EDUCATIONAL analytics terminal with access to your simulated portfolio data (stocks, bonds, ETFs, commodities, crypto, REITs, FX).\n\nI can provide quantitative observations on diversification, risk metrics, sector exposure, performance attribution and hypothetical allocation scenarios.\n\n**I do not provide personalized investment recommendations** nor financial advice under MiFID II. All analyses are for educational and informational purposes only.\n\nMONETA>_"}]);
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
    return <div key={i} style={{fontSize:24,color:B.gray1,fontFamily:"'Courier New',monospace",lineHeight:1.6}}>{rendered}</div>;
  });

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,padding:"4px 8px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <span style={{fontSize:18,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>MONETA</span>
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
              {m.role==="user"?"USER>":"MONETA>"}
            </div>
            <div>{renderMsg(m.content)}</div>
          </div>
        ))}
        {loading&&(
          <div style={{padding:"6px 8px",borderBottom:`1px solid ${B.border}`}}>
            <div style={{fontSize:14,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>MONETA{">"}</div>
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
          <div style={{fontSize:22,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:3,paddingLeft:2}}>QUICK COMMANDS:</div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {QUICK_Q.map((q,i)=>(
              <button key={i} onClick={()=>send(q)} disabled={loading} style={{
                background:"#000",border:`1px solid ${B.border}`,padding:"3px 6px",
                color:B.gray2,fontSize:14,cursor:"pointer",
                fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${B.blue}`,background:B.panel2,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <span style={{fontSize:24,color:B.blue,fontFamily:"'Courier New',monospace",padding:"8px 8px",fontWeight:700}}>{">"}</span>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") send(); }}
            placeholder="ENTER COMMAND OR QUERY..."
            style={{flex:1,background:"transparent",border:"none",
              padding:"8px 0",color:B.yellow,fontSize:24,
              fontFamily:"'Courier New',monospace",outline:"none",
              letterSpacing:"0.04em",textTransform:"uppercase"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
            background:loading||!input.trim()?B.panel2:B.blue,
            border:"none",padding:"8px 12px",color:B.white,
            fontFamily:"'Courier New',monospace",fontSize:15,fontWeight:700,
            cursor:loading||!input.trim()?"not-allowed":"pointer",textTransform:"uppercase"}}>GO</button>
        </div>
        <div style={{fontSize:22,color:B.gray4,fontFamily:"'Courier New',monospace",
          padding:"0 8px 4px",letterSpacing:"0.04em"}}>
          FOR INFORMATIONAL PURPOSES ONLY. NOT FINANCIAL ADVICE.
        </div>
      </div>
    </div>
  );
}

function NewsPage({holdings,setPage}:any) {
  const [tab, setTab] = useState<"market"|"holdings"|"symbol">("market");
  const [marketCat, setMarketCat] = useState("general");
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [holdNews, setHoldNews] = useState<any[]>([]);
  const [symInput, setSymInput] = useState("");
  const [symActive, setSymActive] = useState("");
  const [symNews, setSymNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState("");
  const [sentBusy, setSentBusy] = useState(false);

  // Filter state
  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState<"24h"|"3d"|"7d"|"14d"|"30d"|"all"|"custom">("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState<"newest"|"oldest"|"relevance">("newest");
  const [showFilters, setShowFilters] = useState(false);

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
      const sys = `You are MONETA AI, an EDUCATIONAL market-analysis assistant. You do NOT provide personalized investment recommendations, buy/sell calls or financial advice under MiFID II.
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
              ✦ MONETA AI SENTIMENT
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
          <FKeyBar page={page} setPage={setPage}/>
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
          ⚠ MONETA — REGULATORY NOTICE
        </div>
        <div style={{padding:"14px 16px",color:B.gray1,fontSize:14,lineHeight:1.55}}>
          <div style={{color:B.yellow,fontWeight:700,marginBottom:6,letterSpacing:"0.05em"}}>
            ▸ NOT FINANCIAL ADVICE
          </div>
          <p style={{margin:"0 0 10px 0"}}>
            Moneta is an <b style={{color:B.cyan}}>educational and informational
            analytics terminal</b>. Market data, portfolio simulations, risk
            metrics and AI-generated analyses are provided <b>solely for
            educational purposes</b> and do not constitute — and must not be
            interpreted as — investment advice under <b>MiFID II</b>,
            <b> SEC</b> or <b>ESMA</b> regulations.
          </p>
          <p style={{margin:"0 0 10px 0"}}>
            Moneta's AI produces <b>hypothetical scenarios</b> and
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
