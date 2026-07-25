import { useState, useMemo, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend } from "recharts";
import {
  B, fmt, fmtM, pCol, pSign, groupBy, pMet, PIE_COLS,
  BPanel, FKey, computeAlerts, SEV_STYLE, computeCagr,
} from "@/lib/uiShared";
import { aiChatAsUser } from "@/lib/ai.functions";
import { getInvestorProfile } from "@/lib/profile.functions";
import { fetchQuote as srvQuote, searchSecurities as srvSearch, fetchPriceHistory as srvPriceHistory } from "@/lib/finance.functions";
import { usePersistentState } from "@/hooks/usePersistentState";
const FONT = "'Courier New', Courier, monospace";

const BENCHMARKS = [
  { sym: "SPY", label: "S&P 500" },
  { sym: "QQQ", label: "NASDAQ 100" },
  { sym: "ACWI", label: "MSCI ACWI" },
];

function KpiCard({ label, value, sub, subColor }: any) {
  return (
    <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.08em", fontFamily: FONT, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || B.gray3, fontFamily: FONT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AllocationPanel({ title, data }: { title: string; data: { name: string; value: number; pct: string }[] }) {
  return (
    <BPanel title={title}>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <ResponsiveContainer width={90} height={90}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={42} paddingAngle={1} dataKey="value" strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 10, color: B.gray3, fontWeight: 400, paddingBottom: 4 }}>NAME</th>
                  <th style={{ textAlign: "right", fontSize: 10, color: B.gray3, fontWeight: 400, paddingBottom: 4 }}>WEIGHT</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 6).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: B.gray1, padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLS[i % PIE_COLS.length], display: "inline-block" }} />
                      {d.name}
                    </td>
                    <td style={{ fontSize: 12, color: B.gray1, textAlign: "right", fontWeight: 700 }}>{d.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {data[0] && (
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>
            Largest: <span style={{ color: B.blue, fontWeight: 700 }}>{data[0].name} ({data[0].pct}%)</span>
          </div>
        )}
      </div>
    </BPanel>
  );
}
function PerformanceTab({ holdings, m }: any) {
  const [range, setRange] = useState<"1M"|"3M"|"6M"|"YTD"|"1Y"|"3Y"|"5Y"|"ALL">("YTD");
  const [view, setView] = useState<"return"|"value"|"drawdown">("return");
  const [benchmark, setBenchmark] = useState("SPY");
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const benchmarkLabel = BENCHMARKS.find(b => b.sym === benchmark)?.label || benchmark;

  useEffect(() => {
    let alive = true;
    const withDates = holdings.filter((h:any) => h.buyDate);
    if (!withDates.length) { setLoading(false); setSeries([]); return; }
    setLoading(true);
    const earliest = withDates.reduce((min:string,h:any)=> h.buyDate < min ? h.buyDate : min, withDates[0].buyDate);

    Promise.all([
      srvPriceHistory({ data: { symbol: benchmark, range: "max", interval: "1d" } }),
      ...withDates.map((h:any) =>
        srvPriceHistory({ data: { symbol: h.asset.ticker, range: "max", interval: "1d" } })
          .then((s:any) => ({ ticker: h.asset.ticker, qty: h.qty, buyDate: h.buyDate, series: s || [] }))
      ),
    ]).then(([spy, ...perHolding]: any) => {
      if (!alive) return;
      const earliestT = new Date(earliest).getTime();
      const days = (spy || []).filter((p:any) => p.t >= earliestT).map((p:any) => p.t);
      const pointers = perHolding.map(() => 0);

      const built = days.map((t:number) => {
        let val = 0;
        perHolding.forEach((h:any, idx:number) => {
          if (new Date(h.buyDate).getTime() > t) return;
          while (pointers[idx]+1 < h.series.length && h.series[pointers[idx]+1].t <= t) pointers[idx]++;
          const price = h.series[pointers[idx]]?.close;
          if (price != null) val += price * h.qty;
        });
        return { t, val };
      }).filter((d:any) => d.val > 0);

      setSeries(built.map((d:any) => {
        const spyPoint = spy.reduce((best:any,p:any)=> (p.t<=d.t ? p : best), null);
        return { t: d.t, val: d.val, spyClose: spyPoint?.close ?? null };
      }));
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [holdings, benchmark]);

  const filtered = useMemo(() => {
    if (!series.length) return [];
    const cutoffDays: Record<string, number> = {"1M":30,"3M":90,"6M":180,"1Y":365,"3Y":1095,"5Y":1825,"YTD":9999,"ALL":100000};
    const now = Date.now();
    let f = series;
    if (range === "YTD") f = series.filter((d:any) => new Date(d.t).getFullYear() === new Date().getFullYear());
    else if (range !== "ALL") f = series.filter((d:any) => (now - d.t) <= cutoffDays[range]*86400000);
    if (f.length < 2) return [];
    const base = f[0].val;
    const spyBase = f[0].spyClose;
    let peak = f[0].val;
    return f.map((d:any) => {
      peak = Math.max(peak, d.val);
      return {
        label: new Date(d.t).toLocaleDateString(undefined,{month:"short",day:"numeric"}),
        t: d.t,
        value: d.val,
        portfolio: base ? ((d.val-base)/base)*100 : 0,
        benchmark: (d.spyClose!=null && spyBase!=null) ? ((d.spyClose-spyBase)/spyBase)*100 : null,
        drawdown: peak>0 ? ((d.val-peak)/peak)*100 : 0,
      };
    });
  }, [series, range]);

  const stats = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0], last = filtered[filtered.length-1];
    const portfolioReturn = last.portfolio;
    const benchmarkReturn = last.benchmark ?? 0;
    const alpha = portfolioReturn - benchmarkReturn;
    const totalGain = last.value - (first.value / (1+first.portfolio/100));
    const maxDD = Math.min(...filtered.map((d:any)=>d.drawdown));

    const days = (last.t - first.t) / 86400000;
    const years = Math.max(days/365, 1/365);
    const cagr = (Math.pow(last.value/first.value, 1/years) - 1) * 100;

    const dailyReturns:number[] = [];
    for (let i=1;i<filtered.length;i++) dailyReturns.push((filtered[i].value-filtered[i-1].value)/filtered[i-1].value);
    const downside = dailyReturns.filter(r=>r<0);
    const downsideDev = downside.length ? Math.sqrt(downside.reduce((s,r)=>s+r*r,0)/downside.length) * Math.sqrt(252) * 100 : 0;
    const meanDaily = dailyReturns.reduce((s,r)=>s+r,0)/(dailyReturns.length||1);
    const annualizedRet = meanDaily*252*100;
    const sortino = downsideDev>0 ? annualizedRet/downsideDev : 0;
    const calmar = maxDD<0 ? cagr/Math.abs(maxDD) : 0;

    const monthMap = new Map<string,{first:number;last:number}>();
    filtered.forEach((d:any) => {
      const key = new Date(d.t).toISOString().slice(0,7);
      if (!monthMap.has(key)) monthMap.set(key, {first:d.value, last:d.value});
      else monthMap.get(key)!.last = d.value;
    });
    const months = Array.from(monthMap.values());
    const winningMonths = months.filter(mo => mo.last >= mo.first).length;

    return { portfolioReturn, benchmarkReturn, alpha, totalGain, maxDD, cagr, sortino, calmar, winningMonths, totalMonths: months.length };
  }, [filtered]);

  const perHoldingReturn = useMemo(() => {
    return holdings
      .filter((h:any) => h.costPrice != null && h.asset.price != null)
      .map((h:any) => ({
        ticker: h.asset.ticker,
        pct: ((h.asset.price - h.costPrice) / h.costPrice) * 100,
        contribution: m.total > 0 ? ((h.value - h.costPrice*h.qty) / m.total) * 100 : 0,
        sector: h.asset.sector || h.asset.industry || "OTHER",
      }))
      .sort((a:any,b:any) => b.contribution - a.contribution);
  }, [holdings, m]);

  const sectorAttribution = useMemo(() => {
    const map = new Map<string, number>();
    perHoldingReturn.forEach((h:any) => map.set(h.sector, (map.get(h.sector)||0) + h.contribution));
    return Array.from(map.entries()).map(([name,value]) => ({name, value})).sort((a,b)=>b.value-a.value);
  }, [perHoldingReturn]);

  const explainPerformance = async () => {
    if (!stats) return;
    setAiBusy(true); setAiText("");
    try {
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL analytics assistant. Explain performance drivers factually and educationally. No personalized advice. Max 200 words. End with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."`;
      const prompt = `Portfolio performance summary: return ${fmt(stats.portfolioReturn,1)}% vs ${benchmarkLabel} ${fmt(stats.benchmarkReturn,1)}% (alpha ${pSign(fmt(stats.alpha,1))}%). CAGR ${fmt(stats.cagr,1)}%, max drawdown ${fmt(stats.maxDD,1)}%, Sortino ${fmt(stats.sortino,2)}, Calmar ${fmt(stats.calmar,2)}. Top contributors: ${perHoldingReturn.slice(0,3).map((h:any)=>`${h.ticker} ${pSign(fmt(h.contribution,1))}pp`).join(", ")}. Explain what's driving this performance and what it illustrates educationally.`;
      const { reply } = await aiChatAsUser({ messages: [{ role:"user", content: prompt }], system: sys });
      setAiText(reply);
    } catch (e:any) { setAiText("AI error: " + e.message); }
    finally { setAiBusy(false); }
  };

  if (loading) return (
    <div style={{ padding: 30, textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING…</div>
  );
  if (!stats) return (
    <div style={{ padding: 30, textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}>
      Not enough historical price data yet. Add positions with a purchase date to see this view.
    </div>
  );

  const best = perHoldingReturn[0];
  const worst = perHoldingReturn[perHoldingReturn.length-1];

  return (
    <div>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px,1fr))", gap:12,
        background:B.panel, border:`1px solid ${B.border}`, borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
        {[
          {l:"Portfolio Return", v:`${pSign(fmt(stats.portfolioReturn,1))}%`, sub:range, col:pCol(stats.portfolioReturn)},
          {l:"Benchmark Return", v:`${pSign(fmt(stats.benchmarkReturn,1))}%`, sub:benchmarkLabel, col:B.gray1},
          {l:"Alpha", v:`${pSign(fmt(stats.alpha,1))}%`, sub:range, col:pCol(stats.alpha)},
          {l:"Total Gain", v:`${stats.totalGain>=0?"+":"−"}$${fmtM(Math.abs(stats.totalGain))}`, sub:range, col:pCol(stats.totalGain)},
          {l:"Best Performer", v:best?.ticker||"—", sub:best?`${pSign(fmt(best.pct,1))}%`:"", col:B.green},
          {l:"Worst Performer", v:worst?.ticker||"—", sub:worst?`${pSign(fmt(worst.pct,1))}%`:"", col:B.red},
        ].map((k,i)=>(
          <div key={i}>
            <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>{k.l}</div>
            <div style={{fontSize:17,fontWeight:700,color:k.col,fontFamily:FONT}}>{k.v}</div>
            <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:10 }}>
        {/* Chart */}
        <BPanel title="PERFORMANCE OVER TIME">
          <div style={{padding:"10px 12px"}}>
            <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:8}}>
              <div style={{display:"flex", gap:2}}>
                {(["1M","3M","6M","YTD","1Y","3Y","5Y","ALL"] as const).map(r=>(
                  <button key={r} onClick={()=>setRange(r)} style={{
                    background:range===r?B.blue:"transparent", color:range===r?B.white:B.gray2,
                    border:"none", fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6,
                    cursor:"pointer", fontFamily:FONT,
                  }}>{r}</button>
                ))}
              </div>
              <div style={{display:"flex", gap:2}}>
                {BENCHMARKS.map(b=>(
                  <button key={b.sym} onClick={()=>setBenchmark(b.sym)} style={{
                    background:benchmark===b.sym?B.panel2:"transparent", color:benchmark===b.sym?B.gray1:B.gray3,
                    border:`1px solid ${benchmark===b.sym?B.border:"transparent"}`, fontSize:10, fontWeight:700, padding:"3px 6px", borderRadius:6,
                    cursor:"pointer", fontFamily:FONT,
                  }}>{b.label}</button>
                ))}
              </div>
              <div style={{display:"flex", gap:2}}>
                {(["value","return","drawdown"] as const).map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{
                    background:view===v?B.blue:"transparent", color:view===v?B.white:B.gray2,
                    border:`1px solid ${view===v?B.blue:B.border}`, fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6,
                    cursor:"pointer", fontFamily:FONT,
                  }}>{v.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filtered} margin={{top:8,right:16,bottom:8,left:0}}>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:B.gray3}} minTickGap={50} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:B.gray3}} tickFormatter={(v)=>view==="value"?`$${fmtM(v)}`:`${v.toFixed(0)}%`} axisLine={false} tickLine={false} width={50}/>
                  <Tooltip formatter={(v:any)=>view==="value"?`$${fmtM(v)}`:`${v?.toFixed?.(2)}%`} contentStyle={{fontFamily:FONT,fontSize:12,borderRadius:8}}/>
                  <ReferenceLine y={0} stroke={B.border}/>
                  {view==="value" ? (
                    <Line type="monotone" dataKey="value" stroke={B.blue} strokeWidth={2.5} dot={false} name="Portfolio Value"/>
                  ) : view==="drawdown" ? (
                    <Line type="monotone" dataKey="drawdown" stroke={B.red} strokeWidth={2} dot={false} name="Drawdown"/>
                  ) : (
                    <>
                      <Line type="monotone" dataKey="portfolio" stroke={B.blue} strokeWidth={2.5} dot={false} name="Portfolio"/>
                      <Line type="monotone" dataKey="benchmark" stroke={B.gray3} strokeWidth={1.5} dot={false} name={benchmarkLabel}/>
                    </>
                  )}
                  <Legend wrapperStyle={{fontSize:12,fontFamily:FONT}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </BPanel>

        {/* Performance Summary */}
        <BPanel title="PERFORMANCE SUMMARY">
          <div style={{padding:"4px 0"}}>
            {[
              {l:"CAGR", v:`${fmt(stats.cagr,1)}%`},
              {l:`Alpha (vs ${benchmarkLabel})`, v:`${pSign(fmt(stats.alpha,1))}%`, col:pCol(stats.alpha)},
              {l:"Beta (vs S&P 500)", v:fmt(m.wBeta,2)},
              {l:"Sharpe Ratio", v:fmt(m.sharpe,2)},
              {l:"Sortino Ratio", v:fmt(stats.sortino,2)},
              {l:"Max Drawdown", v:`${fmt(stats.maxDD,1)}%`, col:B.red},
              {l:"Volatility (Annualized)", v:`${fmt(m.wVol,1)}%`},
              {l:"Winning Months", v:`${stats.winningMonths} / ${stats.totalMonths}`, col:B.green},
              {l:"Calmar Ratio", v:fmt(stats.calmar,2)},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"7px 14px", borderBottom:i<8?`1px solid ${B.border}`:"none"}}>
                <span style={{fontSize:12,color:B.gray3,fontFamily:FONT}}>{row.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:row.col||B.gray1,fontFamily:FONT}}>{row.v}</span>
              </div>
            ))}
          </div>
        </BPanel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:12 }}>
        {/* Contribution by holding */}
        <BPanel title="PERFORMANCE CONTRIBUTION BY HOLDING">
          <div style={{padding:"10px 12px", height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perHoldingReturn} layout="vertical" margin={{left:10,right:10}}>
                <XAxis type="number" tick={{fontSize:10,fill:B.gray3}} tickFormatter={(v)=>`${v.toFixed(0)}%`}/>
                <YAxis type="category" dataKey="ticker" tick={{fontSize:11,fill:B.gray1}} width={50}/>
                <Tooltip formatter={(v:any)=>`${v.toFixed(2)}pp`} contentStyle={{fontFamily:FONT,fontSize:12}}/>
                <ReferenceLine x={0} stroke={B.border}/>
                <Bar dataKey="contribution" name="Contribution to Return">
                  {perHoldingReturn.map((h:any,i:number)=><Cell key={i} fill={h.contribution>=0?B.green:B.red}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BPanel>

        {/* Sector attribution */}
        <BPanel title="RETURN ATTRIBUTION BY SECTOR">
          <div style={{padding:"10px 12px", display:"flex", gap:10, alignItems:"center"}}>
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={sectorAttribution.map(s=>({...s,value:Math.abs(s.value)}))} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={1} dataKey="value" strokeWidth={0}>
                  {sectorAttribution.map((_,i)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{flex:1}}>
              {sectorAttribution.slice(0,6).map((s,i)=>(
                <div key={i} style={{display:"flex", alignItems:"center", gap:6, marginBottom:3}}>
                  <span style={{width:7,height:7,borderRadius:2,background:PIE_COLS[i%PIE_COLS.length],display:"inline-block"}}/>
                  <span style={{fontSize:11,color:B.gray1,flex:1,fontFamily:FONT}}>{s.name}</span>
                  <span style={{fontSize:11,fontWeight:700,color:pCol(s.value),fontFamily:FONT}}>{pSign(fmt(s.value,1))}%</span>
                </div>
              ))}
            </div>
          </div>
        </BPanel>
      </div>

      {/* AI Performance Commentary */}
      <BPanel title="AI PERFORMANCE COMMENTARY" style={{marginTop:10}}>
        <div style={{padding:12}}>
          <button onClick={explainPerformance} disabled={aiBusy} style={{
            background:"transparent", border:`1px solid ${B.cyan}`, color:B.cyan, padding:"7px 14px",
            borderRadius:6, cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:700, marginBottom:10,
          }}>{aiBusy?"ANALYZING…":aiText?"↻ REFRESH":"EXPLAIN IN DETAIL"}</button>
          {aiText ? (
            <div style={{fontSize:12,color:B.gray1,lineHeight:1.6,fontFamily:FONT}}>
              {aiText.split("\n").map((line,i)=>{
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return <div key={i} style={{marginBottom:6}}>{parts.map((p,j)=>p.startsWith("**")&&p.endsWith("**")?<b key={j} style={{color:B.blue}}>{p.slice(2,-2)}</b>:p)}</div>;
              })}
            </div>
          ) : (
            <div style={{fontSize:12,color:B.gray3,fontFamily:FONT,lineHeight:1.6}}>
              Tap the button for an AI-generated breakdown of what's driving these numbers — educational only.
            </div>
          )}
        </div>
      </BPanel>
    </div>
  );
}

function pearsonCorr(a: (number|null)[], b: (number|null)[]) {
  const pairs: [number, number][] = [];
  for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) pairs.push([a[i] as number, b[i] as number]);
  const n = pairs.length;
  if (n < 2) return 0;
  const meanA = pairs.reduce((s, p) => s + p[0], 0) / n;
  const meanB = pairs.reduce((s, p) => s + p[1], 0) / n;
  let cov = 0, varA = 0, varB = 0;
  for (const [x, y] of pairs) { cov += (x - meanA) * (y - meanB); varA += (x - meanA) ** 2; varB += (y - meanB) ** 2; }
  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? cov / denom : 0;
}

function corrCellStyle(v: number) {
  const t = Math.max(-1, Math.min(1, v));
  const bg = t >= 0 ? `rgba(0,200,120,${(t * 0.55).toFixed(2)})` : `rgba(255,51,51,${(-t * 0.55).toFixed(2)})`;
  return { background: bg };
}

const CORR_MAX_HOLDINGS = 8;

function CorrelationTab({ holdings }: any) {
  const top = useMemo(() => [...holdings].sort((a: any, b: any) => b.value - a.value).slice(0, CORR_MAX_HOLDINGS), [holdings]);
  const topKey = useMemo(() => top.map((h: any) => h.asset.ticker).join("|"), [top]);
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (top.length < 2) { setLoading(false); setMatrix(null); return; }
    setLoading(true);
    Promise.all(top.map((h: any) => srvPriceHistory({ data: { symbol: h.asset.ticker, range: "1y", interval: "1d" } })))
      .then((seriesList: any) => {
        if (!alive) return;
        const tsSets = seriesList.map((s: any) => new Set((s || []).map((p: any) => p.t)));
        const common = tsSets.length ? [...tsSets[0]].filter(t => tsSets.every((set: Set<number>) => set.has(t))).sort((a: number, b: number) => a - b) : [];
        const closesByHolding = seriesList.map((s: any) => {
          const map = new Map((s || []).map((p: any) => [p.t, p.close]));
          return common.map(t => map.get(t) ?? null);
        });
        const returns = closesByHolding.map((closes: any[]) => {
          const r: (number|null)[] = [];
          for (let i = 1; i < closes.length; i++) {
            r.push(closes[i] != null && closes[i-1] != null && closes[i-1] !== 0 ? (closes[i] - closes[i-1]) / closes[i-1] : null);
          }
          return r;
        });
        const n = top.length;
        const m2: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m2[i][j] = i === j ? 1 : pearsonCorr(returns[i], returns[j]);
        setMatrix(m2);
        setLoading(false);
      }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topKey]);

  if (!holdings.length || holdings.length < 2) return (
    <div style={{ padding: 30, textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
      Add at least 2 positions to see correlation.
    </div>
  );

  return (
    <BPanel title="CORRELATION MATRIX (1Y DAILY RETURNS)">
      <div style={{ padding: "12px 14px" }}>
        {holdings.length > CORR_MAX_HOLDINGS && (
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginBottom: 10 }}>
            Showing top {CORR_MAX_HOLDINGS} of {holdings.length} holdings by weight.
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13, padding: 20 }}>LOADING…</div>
        ) : !matrix ? (
          <div style={{ textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13, padding: 20 }}>Not enough price history yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: FONT, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: 4 }} />
                  {top.map((h: any) => (
                    <th key={h.asset.ticker} style={{ padding: 4, color: B.blue, fontWeight: 700, minWidth: 44 }}>{h.asset.ticker}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top.map((h: any, i: number) => (
                  <tr key={h.asset.ticker}>
                    <td style={{ padding: 4, color: B.blue, fontWeight: 700, textAlign: "right" }}>{h.asset.ticker}</td>
                    {top.map((_: any, j: number) => (
                      <td key={j} style={{ padding: "6px 8px", textAlign: "center", color: B.gray1, ...corrCellStyle(matrix[i][j]) }}>
                        {matrix[i][j].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, marginTop: 10 }}>
          +1 = move together · 0 = unrelated · −1 = move opposite. Lower correlation across holdings generally means more diversification benefit.
        </div>
      </div>
    </BPanel>
  );
}

function BacktestTab() {
  const [ticker, setTicker] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestDebounce = useRef<any>(null);
  const [amount, setAmount] = useState("5000");
  const oneYearAgo = new Date(Date.now() - 365*86400000).toISOString().slice(0,10);
  const [startDate, setStartDate] = useState(oneYearAgo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const todayYmd = new Date().toISOString().slice(0,10);

  const handleTickerInput = (v: string) => {
    setTicker(v.toUpperCase());
    setResult(null);
    clearTimeout(suggestDebounce.current);
    if (!v.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestDebounce.current = setTimeout(async () => {
      try {
        const res = await srvSearch({ data: { q: v } });
        setSuggestions(res || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 350);
  };

  const run = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym || !startDate) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const series = await srvPriceHistory({ data: { symbol: sym, range: "max", interval: "1d" } });
      if (!series || !series.length) { setError("No historical data available for this ticker."); return; }
      const startT = new Date(startDate).getTime();
      const fromStart = series.filter((p: any) => p.t >= startT);
      if (!fromStart.length) { setError("No trading data on or after this date."); return; }
      const entryPrice = fromStart[0].close;
      const amt = parseFloat(amount) || 0;
      if (amt <= 0 || entryPrice <= 0) { setError("Enter a valid amount."); return; }
      const shares = amt / entryPrice;
      const chartData = fromStart.map((p: any) => ({
        t: p.t,
        label: new Date(p.t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }),
        value: shares * p.close,
      }));
      const finalValue = chartData[chartData.length-1].value;
      const days = (fromStart[fromStart.length-1].t - fromStart[0].t) / 86400000;
      const cagr = computeCagr(amt, finalValue, days);
      const totalReturnPct = ((finalValue - amt) / amt) * 100;
      setResult({
        chartData, finalValue, shares, entryPrice, cagr, totalReturnPct,
        actualStartDate: new Date(fromStart[0].t).toISOString().slice(0,10),
      });
    } catch (e: any) {
      setError(e.message || "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BPanel title="HISTORICAL BACKTEST">
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginBottom: 10, lineHeight: 1.5 }}>
          "What if I'd invested $X on date Y?" — a direct historical replay using real closing prices, not a forecast.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ position: "relative", flex: "1 1 140px" }}>
            <input value={ticker} onChange={e => handleTickerInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && run()}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="TICKER" style={{ width: "100%", background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, padding: "6px 8px", fontFamily: FONT, fontSize: 12, borderRadius: 6 }} />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                background: B.panel, border: `1px solid ${B.border}`, borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                {suggestions.slice(0, 8).map((r: any) => (
                  <div key={r.symbol} onClick={() => { setTicker(r.symbol); setShowSuggestions(false); setSuggestions([]); }} style={{
                    padding: "6px 10px", cursor: "pointer", fontFamily: FONT, fontSize: 12, borderBottom: `1px solid ${B.border}`,
                  }}>
                    <span style={{ color: B.blue, fontWeight: 700 }}>{r.symbol}</span>
                    <span style={{ color: B.gray3, marginLeft: 6 }}>{r.shortName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
            type="number" placeholder="AMOUNT ($)" style={{ width: 110, background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, padding: "6px 8px", fontFamily: FONT, fontSize: 12, borderRadius: 6 }} />
          <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" max={todayYmd}
            style={{ background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, padding: "6px 8px", fontFamily: FONT, fontSize: 12, borderRadius: 6 }} />
          <button onClick={run} disabled={busy || !ticker.trim()} style={{
            background: B.blue, border: "none", color: B.white, padding: "6px 14px", borderRadius: 6,
            cursor: busy ? "wait" : "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700,
          }}>{busy ? "..." : "RUN BACKTEST"}</button>
        </div>

        {error && <div style={{ fontSize: 11, color: B.red, fontFamily: FONT, marginBottom: 8 }}>{error}</div>}

        {result && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>Final Value</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>${fmtM(result.finalValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>Total Return</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: pCol(result.totalReturnPct), fontFamily: FONT }}>{pSign(fmt(result.totalReturnPct,1))}%</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>CAGR</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: pCol(result.cagr), fontFamily: FONT }}>{fmt(result.cagr,1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>Entry</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{fmt(result.shares,4)} sh @ {result.entryPrice.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT }}>{result.actualStartDate}</div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: B.gray3 }} minTickGap={50} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: B.gray3 }} tickFormatter={(v) => `$${fmtM(v)}`} axisLine={false} tickLine={false} width={50} />
                  <Tooltip formatter={(v: any) => `$${fmtM(v)}`} contentStyle={{ fontFamily: FONT, fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke={B.blue} strokeWidth={2.5} dot={false} name="Hypothetical Value" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </BPanel>
  );
}

export default function AnalysisPage({ holdings, setPage }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);
  const [sub, setSub] = useState<"alloc" | "risk" | "perf" | "corr" | "backtest">("alloc");
  const [aiExplain, setAiExplain] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [whatIfTicker, setWhatIfTicker] = useState("");
  const [whatIfQty, setWhatIfQty] = useState("10");
  const [whatIfQuote, setWhatIfQuote] = useState<any>(null);
  const [whatIfBusy, setWhatIfBusy] = useState(false);
  const [whatIfError, setWhatIfError] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setPendingAiPrompt] = usePersistentState<string>("ai_pending_prompt", "");
  const suggestDebounce = useRef<any>(null);

  const handleTickerInput = (v: string) => {
    setWhatIfTicker(v.toUpperCase());
    setWhatIfQuote(null);
    clearTimeout(suggestDebounce.current);
    if (!v.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestDebounce.current = setTimeout(async () => {
      try {
        const res = await srvSearch({ data: { q: v } });
        setSuggestions(res || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 350);
  };

  const pickSuggestion = (r: any) => {
    setWhatIfTicker(r.symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const runWhatIf = async () => {
    if (!whatIfTicker.trim()) return;
    setWhatIfBusy(true); setWhatIfError(""); setWhatIfQuote(null);
    try {
      const q = await srvQuote({ data: { symbol: whatIfTicker.trim().toUpperCase() } });
      if (q?.price == null) { setWhatIfError("No price data found for this ticker."); return; }
      setWhatIfQuote(q);
    } catch (e: any) {
      setWhatIfError(e.message || "Lookup failed.");
    } finally {
      setWhatIfBusy(false);
    }
  };
const sendToAI = () => {
    if (!whatIf) return;
    const prompt = `Analyze this hypothetical scenario in depth: adding ${fmt(whatIf.qty,whatIf.qty<1?4:2)} shares of ${whatIfTicker} (≈$${fmt(whatIf.amount,0)} at $${whatIf.price.toFixed(2)}/share, sector: ${whatIf.sector}) to my current portfolio.

Before: ${whatIf.sector} exposure ${fmt(whatIf.beforeSectorPct,1)}%, HHI concentration ${whatIf.oldHHI.toFixed(0)}, ${holdings.length} positions.
After: ${whatIf.sector} exposure would become ${fmt(whatIf.afterSectorPct,1)}%, HHI would become ${whatIf.newHHI.toFixed(0)}, ${whatIf.newPositionCount} positions.

Give a deeper educational breakdown: what does this concentration/diversification change mean in practice, what hypothetical risks or benefits does it illustrate, and what alternative hypothetical allocations could achieve a similar goal with less concentration risk.`;
    setPendingAiPrompt(prompt);
    setPage("ai");
  };
  // Simulated by share count, not a flat dollar amount — hooks straight into
  // the live quote's price so the resulting $ exposure (and therefore its
  // weight/risk impact) reflects what that many shares are actually worth.
  const whatIf = useMemo(() => {
    if (!whatIfQuote || whatIfQuote.price == null) return null;
    const qty = parseFloat(whatIfQty) || 0;
    if (qty <= 0) return null;
    const price = whatIfQuote.price;
    const amount = qty * price;

    const newTotal = m.total + amount;
    const newSector = whatIfQuote.sector || whatIfQuote.industry || "OTHER";
    const beforeSectorValue = holdings
      .filter((h: any) => (h.asset.sector || h.asset.industry || "OTHER") === newSector)
      .reduce((s: number, h: any) => s + h.value, 0);
    const afterSectorPct = ((beforeSectorValue + amount) / newTotal) * 100;
    const beforeSectorPct = m.total > 0 ? (beforeSectorValue / m.total) * 100 : 0;

    const newHoldings = [...holdings, { asset: whatIfQuote, value: amount }];
    const newHHI = newHoldings.reduce((s: number, h: any) => s + Math.pow((h.value / newTotal) * 100, 2), 0);
    const oldHHI = m.hhi;

    return {
      sector: newSector,
      qty, price, amount,
      newWeight: (amount / newTotal) * 100,
      beforeSectorPct, afterSectorPct,
      oldHHI, newHHI,
      newPositionCount: holdings.length + 1,
    };
  }, [whatIfQuote, whatIfQty, holdings, m]);

  if (!holdings.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 15, color: B.gray3, fontFamily: FONT }}>NO DATA — ADD SECURITIES VIA SEARCH</span>
    </div>
  );

  const sD = groupBy(holdings, "sector", m.total);
  const gD = groupBy(holdings, "geo", m.total);
  const tD = groupBy(holdings, "type", m.total);
  const topHoldings = [...holdings].sort((a: any, b: any) => b.value - a.value).slice(0, 5);
  const alerts = useMemo(() => computeAlerts(holdings, m), [holdings, m]);
  const highCount = alerts.filter(a => a.sev === "HIGH").length;
  const medCount = alerts.filter(a => a.sev === "MED").length;

  const explainAlerts = async () => {
    if (!alerts.length || aiBusy) return;
    setAiBusy(true); setAiExplain("");
    try {
      const alertsText = alerts.map((a, i) => `${i+1}. [${a.sev}] ${a.title} (${a.metric}): ${a.detail}`).join("\n");
      const positionsText = holdings.map((h: any) => `${h.asset.ticker} — ${((h.value/m.total)*100).toFixed(1)}% weight, sector: ${h.asset.sector || "OTHER"}`).join("\n");
      let profileText = "";
      try {
        const p = await getInvestorProfile();
        if (p && (p.age_range || p.investment_goal)) {
          profileText = `\nInvestor context (self-reported): age ${p.age_range||"N/A"}, goal ${p.investment_goal||"N/A"}, horizon ${p.time_horizon||"N/A"}, risk tolerance ${p.risk_tolerance||"N/A"}, experience ${p.experience_level||"N/A"}. ACTIVELY shape the hypothetical rebalancing scenarios around this context (e.g. a conservative or short-horizon profile should see risk-reduction-leaning examples; an aggressive or long-horizon profile should see growth-tilted ones) — this changes WHICH educational scenarios you illustrate, never a reason to give a personalized recommendation.`;
        }
      } catch {}
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL analytics assistant. NO personalized investment advice under MiFID II. Frame everything as HYPOTHETICAL SCENARIOS and QUANTITATIVE OBSERVATIONS.
Structure: 1) brief overview 2) 2-3 key hypothetical scenarios with quantitative rationale 3) BOTTOM LINE. Use **bold** for key metrics.
ALWAYS end with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."
Max 250 words. Respond in ENGLISH.${profileText}`;
      const prompt = `My hypothetical portfolio positions:\n${positionsText}\n\nActive risk alerts:\n${alertsText}\n\nExplain these alerts and outline hypothetical rebalancing scenarios (educational only).`;
      const { reply } = await aiChatAsUser({ messages: [{ role: "user", content: prompt }], system: sys });
      setAiExplain(reply);
    } catch (e: any) {
      setAiExplain("AI error: " + e.message);
    } finally { setAiBusy(false); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 2, padding: "3px 4px", borderBottom: `1px solid ${B.border}`, background: B.panel2, flexShrink: 0 }}>
        {[{ id: "alloc", l: "ALLOCATION" }, { id: "risk", l: `RISK${highCount+medCount>0?` (${highCount+medCount})`:""}` }, { id: "perf", l: "PERFORMANCE" }, { id: "corr", l: "CORRELATION" }, { id: "backtest", l: "BACKTEST" }].map(t => (
          <FKey key={t.id} label={t.l} active={sub === t.id} onClick={() => setSub(t.id as any)} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, padding: 12 }}>
        {sub === "alloc" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <KpiCard label="Total Portfolio Value" value={`$${fmtM(m.total)}`} sub="Market value" />
              <KpiCard label="Total Holdings" value={holdings.length} sub="Securities" />
              <KpiCard label="Largest Sector" value={sD[0]?.name || "N/A"} sub={sD[0] ? `${sD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard label="Main Geography" value={gD[0]?.name || "N/A"} sub={gD[0] ? `${gD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard label="Main Asset Class" value={tD[0]?.name || "N/A"} sub={tD[0] ? `${tD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard label="Day Change" value={`${pSign(fmt(m.wDay,2))}%`} sub="Since prev. close" subColor={pCol(m.wDay)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginBottom: 10 }}>
              <AllocationPanel title="SECTOR ALLOCATION" data={sD} />
              <AllocationPanel title="GEOGRAPHIC EXPOSURE" data={gD} />
              <AllocationPanel title="ASSET ALLOCATION" data={tD} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
              <BPanel title="TOP HOLDINGS">
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: B.gray3 }}>
                      <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 400 }}>SYMBOL</th>
                      <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 400 }}>WEIGHT</th>
                      <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 400 }}>VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHoldings.map((h: any) => (
                      <tr key={h.asset.ticker} style={{ borderTop: `1px solid ${B.border}` }}>
                        <td style={{ padding: "6px 10px", color: B.blue, fontWeight: 700 }}>{h.asset.ticker}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: B.gray1 }}>{((h.value/m.total)*100).toFixed(1)}%</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: B.gray1 }}>${fmtM(h.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </BPanel>

              <BPanel title="RISK CONCENTRATION VIEW">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, flexWrap: "wrap" }}>
                  <table style={{ flex: 1, minWidth: 200, borderCollapse: "collapse", fontFamily: FONT, fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: B.gray3, fontSize: 10 }}>
                        <th style={{ textAlign: "left", paddingBottom: 6 }}>HOLDING</th>
                        <th style={{ textAlign: "right", paddingBottom: 6 }}>WEIGHT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topHoldings.map((h: any) => (
                        <tr key={h.asset.ticker} style={{ borderTop: `1px solid ${B.border}` }}>
                          <td style={{ padding: "5px 0", color: B.gray1 }}>{h.asset.ticker}</td>
                          <td style={{ padding: "5px 0", textAlign: "right", color: B.gray1, fontWeight: 700 }}>{((h.value/m.total)*100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={topHoldings.map((h: any) => ({ name: h.asset.ticker, value: h.value }))} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={1} dataKey="value" strokeWidth={0}>
                        {topHoldings.map((_: any, i: number) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </BPanel>
            </div>
          </>
        )}

        {sub === "risk" && (() => {
          const topH = topHoldings[0];
          const topHPct = topH ? (topH.value/m.total)*100 : 0;
          // Sector concentration only applies to single-sector exposures (stocks/REITs) —
          // ETFs/bonds/commodities/crypto/FX are diversified-by-construction or not a
          // "sector" concept, so they're excluded here (kept in the alloc tab's `sD`,
          // which is a display breakdown, not a risk judgment).
          const sectorRiskHoldings = holdings.filter((h:any) => !h.asset.category || ["STOCK","REIT"].includes(h.asset.category));
          const sDRisk = groupBy(sectorRiskHoldings, "sector", m.total);
          const topSectorPct = sDRisk[0]?.pct ?? 0;
          const topGeoPct = gD[0]?.pct ?? 0;
          const nHoldings = holdings.length;
          const maxDD = m.wVol * 2.5; // rough educational proxy, not real tracked drawdown

          const riskScore = Math.round(Math.min(100,
            topHPct * 0.9 +
            Math.max(0, topSectorPct - 20) * 0.6 +
            Math.max(0, (5 - nHoldings)) * 8 +
            Math.max(0, m.wVol - 15) * 0.8
          ));
          const riskLabel = riskScore >= 70 ? "HIGH RISK" : riskScore >= 40 ? "MODERATE RISK" : "LOW RISK";
          const riskColor = riskScore >= 70 ? B.red : riskScore >= 40 ? B.yellow : B.green;

          const drivers = [
            { l:"SINGLE NAME RISK", v:`${topHPct.toFixed(1)}%`, sub:topH?.asset.ticker||"—", sev: topHPct>40?"HIGH":topHPct>25?"MED":"OK" },
            { l:"SECTOR RISK", v:`${topSectorPct}%`, sub:sDRisk[0]?.name||"—", sev: topSectorPct>50?"HIGH":topSectorPct>35?"MED":"OK" },
            { l:"DIVERSIFICATION RISK", v:`${nHoldings}`, sub:"Positions", sev: nHoldings<5?"HIGH":nHoldings<10?"MED":"OK" },
            { l:"GEOGRAPHIC RISK", v:`${topGeoPct}%`, sub:gD[0]?.name||"—", sev: topGeoPct>80?"MED":"OK" },
          ];

          const alertRows = [
            { l:"Single Name Exposure", cur:topHPct, target:20, isPct:true },
            { l:`Sector Exposure (${sDRisk[0]?.name||"—"})`, cur:topSectorPct, target:30, isPct:true },
            { l:"Geographic Exposure", cur:topGeoPct, target:70, isPct:true, inverse:true },
            { l:"Diversification (Positions)", cur:nHoldings, target:10, isPct:false, more:true },
          ];

          // Full hypothetical portfolio if the What-If simulation below is
          // applied — rebuilt with the exact same holdings + math used for
          // the "before" figures above (pMet/groupBy), not approximations,
          // so every risk metric shown here (not just the score) has a
          // precise "after" counterpart.
          const hypHoldings = whatIf ? [...holdings, { asset: whatIfQuote, value: whatIf.amount }] : null;
          const hypM = hypHoldings ? pMet(hypHoldings) : null;
          const hypSectorRiskHoldings = hypHoldings ? hypHoldings.filter((h:any) => !h.asset.category || ["STOCK","REIT"].includes(h.asset.category)) : null;
          const hypSDRisk = hypSectorRiskHoldings && hypM ? groupBy(hypSectorRiskHoldings, "sector", hypM.total) : null;
          const hypGD = hypHoldings && hypM ? groupBy(hypHoldings, "geo", hypM.total) : null;
          const hypTopH = hypHoldings ? [...hypHoldings].sort((a:any,b:any) => b.value - a.value)[0] : null;
          const hypTopHPct = hypM && hypTopH ? (hypTopH.value / hypM.total) * 100 : null;
          const hypTopSectorPct = hypSDRisk?.[0]?.pct ?? null;
          const hypTopGeoPct = hypGD?.[0]?.pct ?? null;
          const hypNHoldings = hypHoldings ? hypHoldings.length : null;
          const hypMaxDD = hypM ? hypM.wVol * 2.5 : null;
          const hypRiskScore = (whatIf && hypM) ? Math.round(Math.min(100,
            (hypTopHPct ?? 0) * 0.9 +
            Math.max(0, (hypTopSectorPct ?? 0) - 20) * 0.6 +
            Math.max(0, (5 - (hypNHoldings ?? 0))) * 8 +
            Math.max(0, hypM.wVol - 15) * 0.8
          )) : null;

          // One row per risk metric shown in RISK SUMMARY/RISK DRIVERS above,
          // paired with its hypothetical "after" value — this is what actually
          // answers "show me every risk and how it changes" in the What-If panel.
          const riskDeltaRows = whatIf ? [
            { l: "Single Name Risk", before: topHPct, after: hypTopHPct, dp: 1, suffix: "%", worse: "higher" },
            { l: `Sector Risk (${hypSDRisk?.[0]?.name || sDRisk[0]?.name || "—"})`, before: topSectorPct, after: hypTopSectorPct, dp: 0, suffix: "%", worse: "higher" },
            { l: "Geographic Risk", before: topGeoPct, after: hypTopGeoPct, dp: 0, suffix: "%", worse: "higher" },
            { l: "Diversification (Positions)", before: nHoldings, after: hypNHoldings, dp: 0, suffix: "", worse: "lower" },
            { l: "Volatility (Ann.)", before: m.wVol, after: hypM?.wVol, dp: 1, suffix: "%", worse: "higher" },
            { l: "Max Drawdown (est.)", before: maxDD, after: hypMaxDD, dp: 1, suffix: "%", worse: "higher", negate: true },
            { l: "Sharpe Ratio", before: m.sharpe, after: hypM?.sharpe, dp: 2, suffix: "", worse: "lower" },
            { l: "Beta (vs S&P 500)", before: m.wBeta, after: hypM?.wBeta, dp: 2, suffix: "", worse: "higher" },
          ] : [];

          return (
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>

              {/* Risk Summary */}
              <BPanel title="RISK SUMMARY">
                <div style={{padding:"14px 16px",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{textAlign:"center",minWidth:100}}>
                    <div style={{fontSize:32,fontWeight:700,color:riskColor,fontFamily:FONT}}>{riskScore}</div>
                    <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>/100</div>
                    <div style={{fontSize:11,fontWeight:700,color:riskColor,fontFamily:FONT,marginTop:4}}>{riskLabel}</div>
                  </div>
                  <div style={{flex:1,minWidth:180,fontSize:12,color:B.gray1,fontFamily:FONT,lineHeight:1.5}}>
                    Score based on concentration, sector exposure, diversification and volatility of your current holdings. This is our own educational scoring method, not an external credit or risk rating.
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px,1fr))",gap:10,padding:"0 16px 16px"}}>
                  <div>
                    <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Expected Volatility (Ann.)</div>
                    <div style={{fontSize:16,fontWeight:700,color:B.gray1,fontFamily:FONT}}>{fmt(m.wVol,1)}%</div>
                    <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>Benchmark (S&amp;P 500, approx.): 15.6%</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Max Drawdown (est.)</div>
                    <div style={{fontSize:16,fontWeight:700,color:B.red,fontFamily:FONT}}>-{fmt(maxDD,1)}%</div>
                    <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>Estimate, not tracked history</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Sharpe Ratio</div>
                    <div style={{fontSize:16,fontWeight:700,color:m.sharpe>0?B.green:B.red,fontFamily:FONT}}>{fmt(m.sharpe,2)}</div>
                    <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>Benchmark (S&amp;P 500, approx.): 0.78</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Beta (vs S&amp;P 500)</div>
                    <div style={{fontSize:16,fontWeight:700,color:B.gray1,fontFamily:FONT}}>{fmt(m.wBeta,2)}</div>
                    <div style={{fontSize:10,color:B.gray3,fontFamily:FONT}}>Benchmark: 1.00 (by definition)</div>
                  </div>
                </div>
              </BPanel>

              {/* Risk Drivers */}
              <BPanel title="RISK DRIVERS">
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))",gap:10,padding:12}}>
                  {drivers.map((d,i)=>{
                    const s = SEV_STYLE[d.sev];
                    return (
                      <div key={i} style={{background:B.panel2,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${s.border}`}}>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase",marginBottom:4}}>{d.l}</div>
                        <div style={{fontSize:18,fontWeight:700,color:B.gray1,fontFamily:FONT}}>{d.v}</div>
                        <div style={{fontSize:11,color:B.gray3,fontFamily:FONT,marginBottom:6}}>{d.sub}</div>
                        <span style={{fontSize:9,fontWeight:700,color:s.text,border:`1px solid ${s.border}`,padding:"1px 6px",borderRadius:4}}>{d.sev}</span>
                      </div>
                    );
                  })}
                </div>
              </BPanel>

              {/* What-If Analysis */}
              <BPanel title="WHAT-IF ANALYSIS">
                <div style={{padding:"10px 12px"}}>
                  <div style={{display:"flex",gap:6,marginBottom:10}}>
                    <div style={{position:"relative",flex:1}}>
                      <input value={whatIfTicker} onChange={e => handleTickerInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && runWhatIf()}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="SEARCH TICKER..." style={{width:"100%",background:B.panel2,border:`1px solid ${B.border}`,color:B.gray1,padding:"6px 8px",fontFamily:FONT,fontSize:12,borderRadius:6}} />
                      {showSuggestions && suggestions.length > 0 && (
                        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,
                          background:B.panel,border:`1px solid ${B.border}`,borderRadius:6,marginTop:2,maxHeight:200,overflowY:"auto"}}>
                          {suggestions.slice(0, 8).map((r: any) => (
                            <div key={r.symbol} onClick={() => pickSuggestion(r)} style={{
                              padding:"6px 10px",cursor:"pointer",fontFamily:FONT,fontSize:12,
                              borderBottom:`1px solid ${B.border}`,
                            }}>
                              <span style={{color:B.blue,fontWeight:700}}>{r.symbol}</span>
                              <span style={{color:B.gray3,marginLeft:6}}>{r.shortName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={whatIfQty} onChange={e => setWhatIfQty(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runWhatIf()}
                      type="number" step="any" placeholder="SHARES" style={{width:90,background:B.panel2,border:`1px solid ${B.border}`,color:B.gray1,padding:"6px 8px",fontFamily:FONT,fontSize:12,borderRadius:6}} />
                    <button onClick={runWhatIf} disabled={whatIfBusy || !whatIfTicker.trim()} style={{
                      background:B.blue,border:"none",color:B.white,padding:"6px 14px",borderRadius:6,
                      cursor:whatIfBusy ? "wait" : "pointer",fontFamily:FONT,fontSize:12,fontWeight:700,
                    }}>{whatIfBusy ? "..." : "SIMULATE"}</button>
                  </div>

                  {whatIfError && (
                    <div style={{fontSize:11,color:B.red,fontFamily:FONT,marginBottom:8}}>{whatIfError}</div>
                  )}

                  {!whatIf ? (
                    <div style={{fontSize:11,color:B.gray3,fontFamily:FONT,lineHeight:1.6}}>
                      Enter a ticker and a hypothetical number of shares, then tap Simulate to see the immediate impact on your risk parameters and score — before you actually buy it.
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px,1fr))",gap:10}}>
                      <div>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Portfolio Risk Score</div>
                        <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>
                          {riskScore} → {hypRiskScore}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color: hypRiskScore>riskScore?B.yellow:hypRiskScore<riskScore?B.green:B.gray3,fontFamily:FONT}}>
                          {hypRiskScore>riskScore?"Riskier":hypRiskScore<riskScore?"Improves":"No change"}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>New Position Weight</div>
                        <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>{fmt(whatIf.newWeight,2)}%</div>
                        <div style={{fontSize:11,color:B.gray3,fontFamily:FONT}}>
                          {fmt(whatIf.qty,whatIf.qty<1?4:2)} sh @ ${whatIf.price.toFixed(2)} = ${fmt(whatIf.amount,0)}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>{whatIf.sector} Exposure</div>
                        <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>
                          {fmt(whatIf.beforeSectorPct,1)}% → {fmt(whatIf.afterSectorPct,1)}%
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color: whatIf.afterSectorPct>whatIf.beforeSectorPct?B.yellow:B.green,fontFamily:FONT}}>
                          {pSign(fmt(whatIf.afterSectorPct-whatIf.beforeSectorPct,1))}%
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Concentration (HHI)</div>
                        <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>
                          {whatIf.oldHHI.toFixed(0)} → {whatIf.newHHI.toFixed(0)}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color: whatIf.newHHI>whatIf.oldHHI?B.yellow:B.green,fontFamily:FONT}}>
                          {whatIf.newHHI>whatIf.oldHHI?"More concentrated":"More diversified"}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>Total Positions</div>
                        <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>{holdings.length} → {whatIf.newPositionCount}</div>
                      </div>
                      {riskDeltaRows.map((r,i)=>{
                        const changed = r.after!=null && Math.abs(r.after - r.before) > 0.005;
                        const isWorse = changed && (r.worse === "higher" ? r.after > r.before : r.after < r.before);
                        const color = !changed ? B.gray3 : isWorse ? B.yellow : B.green;
                        const sign = r.negate ? "-" : "";
                        return (
                          <div key={i}>
                            <div style={{fontSize:9,color:B.gray3,fontFamily:FONT,textTransform:"uppercase"}}>{r.l}</div>
                            <div style={{fontSize:15,fontWeight:700,color:B.gray1,fontFamily:FONT}}>
                              {sign}{fmt(r.before,r.dp)}{r.suffix} → {r.after!=null ? `${sign}${fmt(r.after,r.dp)}${r.suffix}` : "—"}
                            </div>
                            <div style={{fontSize:11,fontWeight:700,color,fontFamily:FONT}}>
                              {!changed ? "No change" : isWorse ? "Higher risk" : "Lower risk"}
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={sendToAI} style={{
                        marginTop:10,width:"100%",background:"transparent",border:`1px solid ${B.cyan}`,
                        color:B.cyan,padding:"8px",borderRadius:6,cursor:"pointer",
                        fontFamily:FONT,fontSize:12,fontWeight:700,letterSpacing:"0.06em",
                        gridColumn:"1 / -1",
                      }}>
                        AI ADVANCED ANALYSIS →
                      </button>
                    </div>
                  )}
                </div>
              </BPanel>

              {/* Risk Alerts table */}
              <BPanel title="RISK ALERTS">
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:FONT,fontSize:12}}>
                  <thead>
                    <tr style={{color:B.gray3,fontSize:10}}>
                      <th style={{textAlign:"left",padding:"6px 10px"}}>ALERT</th>
                      <th style={{textAlign:"right",padding:"6px 10px"}}>CURRENT</th>
                      <th style={{textAlign:"right",padding:"6px 10px"}}>TARGET</th>
                      <th style={{textAlign:"center",padding:"6px 10px"}}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertRows.map((r,i)=>{
                      const breach = r.more ? r.cur < r.target : (r.inverse ? r.cur > r.target : r.cur > r.target);
                      return (
                        <tr key={i} style={{borderTop:`1px solid ${B.border}`}}>
                          <td style={{padding:"6px 10px",color:B.gray1}}>{r.l}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",color:B.gray1,fontWeight:700}}>{r.isPct?`${r.cur.toFixed(1)}%`:r.cur}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",color:B.gray3}}>{r.more?`> ${r.target}`:r.isPct?`< ${r.target}%`:r.target}</td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}>
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                              background: breach?"rgba(255,51,51,0.1)":"rgba(0,255,102,0.1)",
                              color: breach?B.red:B.green}}>
                              {breach ? "BREACH" : "WITHIN TARGET"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </BPanel>
            </div>

            {/* AI Risk Explanation */}
            <BPanel title="AI RISK EXPLANATION">
              <div style={{padding:12}}>
                <button onClick={explainAlerts} disabled={aiBusy} style={{
                  width:"100%",background:"transparent",border:`1px solid ${B.cyan}`,color:B.cyan,
                  padding:"8px",cursor:"pointer",fontFamily:FONT,fontSize:12,fontWeight:700,letterSpacing:"0.06em",borderRadius:6,marginBottom:10,
                }}>
                  {aiBusy ? "ANALYZING…" : aiExplain ? "↻ REFRESH EXPLANATION" : "EXPLAIN MY RISK"}
                </button>
                {aiExplain ? (
                  <div style={{fontSize:12,color:B.gray1,lineHeight:1.6,fontFamily:FONT}}>
                    {aiExplain.split("\n").map((line, i) => {
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <div key={i} style={{marginBottom:6}}>
                          {parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <b key={j} style={{color:B.blue}}>{p.slice(2,-2)}</b> : p)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{fontSize:12,color:B.gray3,fontFamily:FONT,lineHeight:1.6}}>
                    Tap the button above for an AI-generated, plain-English breakdown of these risk drivers — educational only, not personalized advice.
                  </div>
                )}
              </div>
            </BPanel>
          </div>
          );
        })()}

        {sub === "perf" && <PerformanceTab holdings={holdings} m={m}/>}
        {sub === "corr" && <CorrelationTab holdings={holdings}/>}
        {sub === "backtest" && <BacktestTab/>}
      </div>
    </div>
  );
}
