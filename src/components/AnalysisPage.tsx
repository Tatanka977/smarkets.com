import { useState, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  B, fmt, fmtM, pCol, pSign, groupBy, pMet, PIE_COLS,
  BPanel, FKey, computeAlerts, SEV_STYLE,
} from "@/lib/uiShared";
import { aiChat } from "@/lib/ai.functions";
import { getInvestorProfile } from "@/lib/profile.functions";
import { fetchQuote as srvQuote, searchSecurities as srvSearch } from "@/lib/finance.functions";
import { usePersistentState } from "@/hooks/usePersistentState";
const FONT = "'Courier New', Courier, monospace";

function KpiCard({ icon, label, value, sub, subColor }: any) {
  return (
    <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 150 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.08em", fontFamily: FONT, textTransform: "uppercase" }}>{label}</span>
      </div>
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

export default function AnalysisPage({ holdings, setPage }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);
  const [sub, setSub] = useState<"alloc" | "risk" | "perf">("alloc");
  const [aiExplain, setAiExplain] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [whatIfTicker, setWhatIfTicker] = useState("");
  const [whatIfAmount, setWhatIfAmount] = useState("5000");
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
    const prompt = `Analyze this hypothetical scenario in depth: adding a $${whatIfAmount} position in ${whatIfTicker} (sector: ${whatIf.sector}) to my current portfolio.

Before: ${whatIf.sector} exposure ${fmt(whatIf.beforeSectorPct,1)}%, HHI concentration ${whatIf.oldHHI.toFixed(0)}, ${holdings.length} positions.
After: ${whatIf.sector} exposure would become ${fmt(whatIf.afterSectorPct,1)}%, HHI would become ${whatIf.newHHI.toFixed(0)}, ${whatIf.newPositionCount} positions.

Give a deeper educational breakdown: what does this concentration/diversification change mean in practice, what hypothetical risks or benefits does it illustrate, and what alternative hypothetical allocations could achieve a similar goal with less concentration risk.`;
    setPendingAiPrompt(prompt);
    setPage("ai");
  };
  const whatIf = useMemo(() => {
    if (!whatIfQuote) return null;
    const amount = parseFloat(whatIfAmount) || 0;
    if (amount <= 0) return null;

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
      newWeight: (amount / newTotal) * 100,
      beforeSectorPct, afterSectorPct,
      oldHHI, newHHI,
      newPositionCount: holdings.length + 1,
    };
  }, [whatIfQuote, whatIfAmount, holdings, m]);

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
      const positionsText = holdings.map((h: any) => `${h.asset.ticker} — ${((h.value/m.total)*100).toFixed(1)}% weight, sector: ${h.asset.sector || "N/A"}`).join("\n");
      let profileText = "";
      try {
        const p = await getInvestorProfile();
        if (p && (p.age_range || p.investment_goal)) {
          profileText = `\nInvestor context (self-reported, for tailoring scenario relevance only): age ${p.age_range||"N/A"}, goal ${p.investment_goal||"N/A"}, horizon ${p.time_horizon||"N/A"}, risk tolerance ${p.risk_tolerance||"N/A"}, experience ${p.experience_level||"N/A"}.`;
        }
      } catch {}
      const sys = `You are STRATEGIC MARKETS AI, an EDUCATIONAL analytics assistant. NO personalized investment advice under MiFID II. Frame everything as HYPOTHETICAL SCENARIOS and QUANTITATIVE OBSERVATIONS.
Structure: 1) brief overview 2) 2-3 key hypothetical scenarios with quantitative rationale 3) BOTTOM LINE. Use **bold** for key metrics.
ALWAYS end with: "DISCLAIMER: For educational and informational purposes only. Not investment advice."
Max 250 words. Respond in ENGLISH.${profileText}`;
      const prompt = `My hypothetical portfolio positions:\n${positionsText}\n\nActive risk alerts:\n${alertsText}\n\nExplain these alerts and outline hypothetical rebalancing scenarios (educational only).`;
      const { reply } = await aiChat({ data: { messages: [{ role: "user", content: prompt }], system: sys } });
      setAiExplain(reply);
    } catch (e: any) {
      setAiExplain("AI error: " + e.message);
    } finally { setAiBusy(false); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 2, padding: "3px 4px", borderBottom: `1px solid ${B.border}`, background: B.panel2, flexShrink: 0 }}>
        {[{ id: "alloc", l: "ALLOCATION" }, { id: "risk", l: `RISK${highCount+medCount>0?` (${highCount+medCount})`:""}` }, { id: "perf", l: "PERFORMANCE" }].map(t => (
          <FKey key={t.id} label={t.l} active={sub === t.id} onClick={() => setSub(t.id as any)} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, padding: 12 }}>
        {sub === "alloc" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <KpiCard icon="🥧" label="Total Portfolio Value" value={`$${fmtM(m.total)}`} sub="Market value" />
              <KpiCard icon="📊" label="Total Holdings" value={holdings.length} sub="Securities" />
              <KpiCard icon="🎯" label="Largest Sector" value={sD[0]?.name || "N/A"} sub={sD[0] ? `${sD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard icon="🌐" label="Main Geography" value={gD[0]?.name || "N/A"} sub={gD[0] ? `${gD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard icon="🥧" label="Main Asset Class" value={tD[0]?.name || "N/A"} sub={tD[0] ? `${tD[0].pct}%` : ""} subColor={B.blue} />
              <KpiCard icon="📈" label="Day Change" value={`${pSign(fmt(m.wDay,2))}%`} sub="Since prev. close" subColor={pCol(m.wDay)} />
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

              <BPanel title="WHAT-IF ANALYSIS">
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input value={whatIfTicker} onChange={e => handleTickerInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && runWhatIf()}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="SEARCH TICKER..." style={{ width: "100%", background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, padding: "6px 8px", fontFamily: FONT, fontSize: 12, borderRadius: 6 }} />
                      {showSuggestions && suggestions.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                          background: B.panel, border: `1px solid ${B.border}`, borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                          {suggestions.slice(0, 8).map((r: any) => (
                            <div key={r.symbol} onClick={() => pickSuggestion(r)} style={{
                              padding: "6px 10px", cursor: "pointer", fontFamily: FONT, fontSize: 12,
                              borderBottom: `1px solid ${B.border}`,
                            }}>
                              <span style={{ color: B.blue, fontWeight: 700 }}>{r.symbol}</span>
                              <span style={{ color: B.gray3, marginLeft: 6 }}>{r.shortName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={whatIfAmount} onChange={e => setWhatIfAmount(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runWhatIf()}
                      type="number" placeholder="AMOUNT" style={{ width: 90, background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, padding: "6px 8px", fontFamily: FONT, fontSize: 12, borderRadius: 6 }} />
                    <button onClick={runWhatIf} disabled={whatIfBusy || !whatIfTicker.trim()} style={{
                      background: B.blue, border: "none", color: B.white, padding: "6px 14px", borderRadius: 6,
                      cursor: whatIfBusy ? "wait" : "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700,
                    }}>{whatIfBusy ? "..." : "SIMULATE"}</button>
                  </div>

                  {whatIfError && (
                    <div style={{ fontSize: 11, color: B.red, fontFamily: FONT, marginBottom: 8 }}>{whatIfError}</div>
                  )}

                  {!whatIf ? (
                    <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, lineHeight: 1.6 }}>
                      Enter a ticker and a hypothetical amount, then tap Simulate to see how it would change your portfolio's sector exposure and concentration — before you actually buy it.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>New Position Weight</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{fmt(whatIf.newWeight,2)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>{whatIf.sector} Exposure</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{holdings.length} → {whatIf.newPositionCount}</div>
                      </div>
                      <button onClick={sendToAI} style={{
                        marginTop: 10, width: "100%", background: "transparent", border: `1px solid ${B.cyan}`,
                        color: B.cyan, padding: "8px", borderRadius: 6, cursor: "pointer",
                        fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
                        gridColumn: "1 / -1",
                      }}>
                        ✦ AI ADVANCED ANALYSIS →
                      </button>
                        <div style={{ fontSize: 11, fontWeight: 700, color: whatIf.afterSectorPct>whatIf.beforeSectorPct?B.yellow:B.green, fontFamily: FONT }}>
                          {pSign(fmt(whatIf.afterSectorPct-whatIf.beforeSectorPct,1))}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>Concentration (HHI)</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>
                          {whatIf.oldHHI.toFixed(0)} → {whatIf.newHHI.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: whatIf.newHHI>whatIf.oldHHI?B.yellow:B.green, fontFamily: FONT }}>
                          {whatIf.newHHI>whatIf.oldHHI?"More concentrated":"More diversified"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, textTransform: "uppercase" }}>Total Positions</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{holdings.length} → {whatIf.newPositionCount}</div>
                      </div>
                    </div>
                  )}
                </div>
              </BPanel>
            </div>
          </>
        )}

        {sub === "risk" && (() => {
          const topH = topHoldings[0];
          const topHPct = topH ? (topH.value/m.total)*100 : 0;
          const topSectorPct = sD[0]?.pct ?? 0;
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
            { l:"SECTOR RISK", v:`${topSectorPct}%`, sub:sD[0]?.name||"—", sev: topSectorPct>50?"HIGH":topSectorPct>35?"MED":"OK" },
            { l:"DIVERSIFICATION RISK", v:`${nHoldings}`, sub:"Positions", sev: nHoldings<5?"HIGH":nHoldings<10?"MED":"OK" },
            { l:"GEOGRAPHIC RISK", v:`${topGeoPct}%`, sub:gD[0]?.name||"—", sev: topGeoPct>80?"MED":"OK" },
          ];

          const alertRows = [
            { l:"Single Name Exposure", cur:topHPct, target:20, isPct:true },
            { l:`Sector Exposure (${sD[0]?.name||"—"})`, cur:topSectorPct, target:30, isPct:true },
            { l:"Geographic Exposure", cur:topGeoPct, target:70, isPct:true, inverse:true },
            { l:"Diversification (Positions)", cur:nHoldings, target:10, isPct:false, more:true },
          ];

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

              {/* Risk Concentration View */}
              <BPanel title="RISK CONCENTRATION VIEW">
                <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:12,flexWrap:"wrap"}}>
                  <table style={{flex:1,minWidth:200,borderCollapse:"collapse",fontFamily:FONT,fontSize:12}}>
                    <thead>
                      <tr style={{color:B.gray3,fontSize:10}}>
                        <th style={{textAlign:"left",paddingBottom:6}}>HOLDING</th>
                        <th style={{textAlign:"right",paddingBottom:6}}>WEIGHT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topHoldings.map((h:any)=>(
                        <tr key={h.asset.ticker} style={{borderTop:`1px solid ${B.border}`}}>
                          <td style={{padding:"5px 0",color:B.gray1}}>{h.asset.ticker}</td>
                          <td style={{padding:"5px 0",textAlign:"right",color:B.gray1,fontWeight:700}}>{((h.value/m.total)*100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={topHoldings.map((h:any)=>({name:h.asset.ticker,value:h.value}))} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={1} dataKey="value" strokeWidth={0}>
                        {topHoldings.map((_:any,i:number)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
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
                  {aiBusy ? "ANALYZING…" : aiExplain ? "↻ REFRESH EXPLANATION" : "✦ EXPLAIN MY RISK"}
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

        {sub === "perf" && (
          <div style={{ padding: "10px", fontSize: 12, color: B.gray3, fontFamily: FONT, textAlign: "center" }}>
            Performance view unchanged — see previous release for full P&amp;L breakdown.
          </div>
        )}
      </div>
    </div>
  );
}
