import { useState, useMemo } from "react";
import { saveInvestorProfile, skipOnboarding } from "@/lib/profile.functions";

const B = { bg:"#000", panel:"#0A0A0A", border:"#2A2A2A", blue:"#0066FF", white:"#fff", gray1:"#CCC", gray2:"#888" };
const FONT = "'Courier New', Courier, monospace";

export interface InvestorProfileField {
  key: string;
  label: string;
  options: string[];
  // Only asked (onboarding) / shown (profile page edit form) when the
  // answers gathered so far satisfy this — used by current_allocation_mix,
  // which only makes sense once someone has said they already have a
  // portfolio. Same predicate is applied in both places against
  // INVESTOR_PROFILE_FIELDS, so onboarding and later edits always agree on
  // which fields currently apply.
  showIf?: (answers: Record<string, string>) => boolean;
}

// Shared with the profile page's "Investor profile" tab, which lets a user
// review/change these answers later — this is the single source of truth
// for the field list/options so the two stay in sync.
export const INVESTOR_PROFILE_FIELDS: InvestorProfileField[] = [
  { key: "age_range", label: "AGE RANGE", options: ["Under 25","25–34","35–44","45–54","55–64","65+"] },
  { key: "investment_goal", label: "PRIMARY GOAL", options: ["Capital growth","Regular income","Capital preservation","Learning/practice"] },
  { key: "time_horizon", label: "TIME HORIZON", options: ["Under 3 years","3–10 years","Over 10 years"] },
  { key: "risk_tolerance", label: "RISK TOLERANCE", options: ["Conservative","Moderate","Aggressive"] },
  { key: "experience_level", label: "EXPERIENCE", options: ["Beginner","Intermediate","Advanced"] },
  { key: "has_started_investing", label: "ALREADY INVESTING?", options: ["Yes, I have a portfolio","Not yet, planning to start"] },
  { key: "current_allocation_mix", label: "CURRENT MIX (ROUGHLY)",
    options: ["Mostly stocks","Mostly bonds","Balanced mix","Mostly crypto","Not sure"],
    showIf: (a) => a.has_started_investing === "Yes, I have a portfolio" },
  { key: "interests", label: "AREAS OF INTEREST",
    options: ["Growth/tech","Dividends/income","Crypto","ESG/sustainable","International markets","No particular preference"] },
  { key: "management_style", label: "MANAGEMENT STYLE", options: ["Hands-on, I like adjusting often","Set it and forget it"] },
  { key: "has_emergency_fund", label: "EMERGENCY FUND SEPARATE FROM INVESTMENTS?", options: ["Yes","No","Not sure what this means"] },
  { key: "familiar_with_metrics", label: "FAMILIAR WITH TERMS LIKE VOLATILITY, SHARPE RATIO?", options: ["Yes, explain briefly","No, explain simply"] },
];

export default function OnboardingQuestionnaire({ onDone }: { onDone: () => void }) {
  // -1 = intro screen, 0..N-1 = index into visibleSteps below (NOT into the
  // full INVESTOR_PROFILE_FIELDS list, which may include a conditional
  // field the current answers don't unlock).
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const visibleSteps = useMemo(
    () => INVESTOR_PROFILE_FIELDS.filter(f => !f.showIf || f.showIf(answers)),
    [answers]
  );
  const current = step >= 0 ? visibleSteps[step] : null;

  const choose = async (value: string) => {
    if (!current) return;
    const next = { ...answers, [current.key]: value };
    // Recomputed against the ANSWER BEING SAVED, not the stale `answers`
    // state, so a change to has_started_investing takes effect on the very
    // next step instead of one question late.
    const nextVisible = INVESTOR_PROFILE_FIELDS.filter(f => !f.showIf || f.showIf(next));
    const idx = nextVisible.findIndex(f => f.key === current.key);
    setAnswers(next);
    if (idx < nextVisible.length - 1) {
      setStep(idx + 1);
    } else {
      setSaving(true);
      try { await saveInvestorProfile({ data: next }); } catch {}
      onDone();
    }
  };

  const skip = async () => {
    try { await skipOnboarding(); } catch {}
    onDone();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,fontFamily:FONT,padding:16}}>
      <div style={{width:"100%",maxWidth:420,maxHeight:"calc(100dvh - 32px)",display:"flex",flexDirection:"column",background:B.panel,border:`1px solid ${B.border}`}}>
        <div style={{background:B.blue,padding:"10px 14px",flexShrink:0}}>
          <div style={{fontSize:15,fontWeight:700,color:B.white,letterSpacing:"0.1em"}}>QUICK INVESTOR PROFILE</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.85)",marginTop:2}}>
            {current ? `STEP ${step+1} OF ${visibleSteps.length} — HELPS THE AI GIVE MORE RELEVANT SCENARIOS` : "OPTIONAL — TAKES ABOUT A MINUTE"}
          </div>
        </div>
        <div style={{padding:16,overflowY:"auto",flex:1,minHeight:0}}>
          {!current ? (
            <>
              <div style={{fontSize:13,color:B.gray1,lineHeight:1.6,marginBottom:16}}>
                A few quick questions help us tailor how the AI explains things to your specific situation — this takes about a minute, and you can always skip or redo it later.
                <br/><br/>
                This is entirely optional, and only shapes HOW concepts are explained to you — never a basis for a specific recommendation.
              </div>
              <button onClick={()=>setStep(0)} style={{
                width:"100%",padding:"12px",background:B.blue,border:"none",
                color:B.white,fontFamily:FONT,fontSize:13,fontWeight:700,cursor:"pointer",minHeight:44,
              }}>Start</button>
            </>
          ) : (
            <>
              <div style={{fontSize:13,color:B.gray1,marginBottom:12,letterSpacing:"0.06em"}}>{current.label}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {current.options.map(opt=>(
                  <button key={opt} disabled={saving} onClick={()=>choose(opt)} style={{
                    textAlign:"left",padding:"12px",background:"#111",border:`1px solid ${B.border}`,
                    color:B.white,fontFamily:FONT,fontSize:13,cursor:"pointer",minHeight:44,
                  }}>{opt}</button>
                ))}
              </div>
            </>
          )}
          <button onClick={skip} disabled={saving} style={{
            marginTop:16,background:"none",border:"none",color:B.gray2,fontSize:11,
            fontFamily:FONT,textDecoration:"underline",cursor:"pointer",
          }}>Skip for now — I'll do this later in my profile</button>
        </div>
      </div>
    </div>
  );
}
