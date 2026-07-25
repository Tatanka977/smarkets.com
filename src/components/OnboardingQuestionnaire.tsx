import { useState } from "react";
import { saveInvestorProfile, skipOnboarding } from "@/lib/profile.functions";

const B = { bg:"#000", panel:"#0A0A0A", border:"#2A2A2A", blue:"#0066FF", white:"#fff", gray1:"#CCC", gray2:"#888" };
const FONT = "'Courier New', Courier, monospace";

// Shared with the profile page's "Investor profile" tab, which lets a user
// review/change these answers later — this is the single source of truth
// for the field list/options so the two stay in sync.
export const INVESTOR_PROFILE_FIELDS = [
  { key: "age_range", label: "AGE RANGE", options: ["Under 25","25–34","35–44","45–54","55–64","65+"] },
  { key: "investment_goal", label: "PRIMARY GOAL", options: ["Capital growth","Regular income","Capital preservation","Learning/practice"] },
  { key: "time_horizon", label: "TIME HORIZON", options: ["Under 3 years","3–10 years","Over 10 years"] },
  { key: "risk_tolerance", label: "RISK TOLERANCE", options: ["Conservative","Moderate","Aggressive"] },
  { key: "experience_level", label: "EXPERIENCE", options: ["Beginner","Intermediate","Advanced"] },
] as const;
const STEPS = INVESTOR_PROFILE_FIELDS;

export default function OnboardingQuestionnaire({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  const choose = async (value: string) => {
    const next = { ...answers, [current.key]: value };
    setAnswers(next);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
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
      <div style={{width:"100%",maxWidth:420,background:B.panel,border:`1px solid ${B.border}`}}>
        <div style={{background:B.blue,padding:"10px 14px"}}>
          <div style={{fontSize:15,fontWeight:700,color:B.white,letterSpacing:"0.1em"}}>QUICK INVESTOR PROFILE</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.85)",marginTop:2}}>STEP {step+1} OF {STEPS.length} — HELPS THE AI GIVE MORE RELEVANT SCENARIOS</div>
        </div>
        <div style={{padding:16}}>
          <div style={{fontSize:13,color:B.gray1,marginBottom:12,letterSpacing:"0.06em"}}>{current.label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {current.options.map(opt=>(
              <button key={opt} disabled={saving} onClick={()=>choose(opt)} style={{
                textAlign:"left",padding:"10px 12px",background:"#111",border:`1px solid ${B.border}`,
                color:B.white,fontFamily:FONT,fontSize:13,cursor:"pointer",
              }}>{opt}</button>
            ))}
          </div>
          <button onClick={skip} disabled={saving} style={{
            marginTop:16,background:"none",border:"none",color:B.gray2,fontSize:11,
            fontFamily:FONT,textDecoration:"underline",cursor:"pointer",
          }}>Skip for now — I'll do this later in my profile</button>
        </div>
      </div>
    </div>
  );
}
