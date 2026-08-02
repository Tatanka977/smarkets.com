import { useState, useEffect } from "react";
import { B } from "@/lib/uiShared";
import { useIsMobile } from "@/hooks/use-mobile";
import { getLearnData, completeLesson } from "@/lib/learn.functions";
import type { LessonGroup, LessonStep, Lesson, LearnStreak } from "@/lib/learn.functions";

const FONT = "'Courier New', Courier, monospace";

type NodeState = "done" | "unlocked" | "locked" | "soon";

function isLessonSetDone(lessons: Lesson[], completed: Set<string>) {
  return lessons.length > 0 && lessons.every((l) => completed.has(l.id));
}

// A group is "coming soon" purely off its own is_published flag — that
// takes priority over the unlock chain, since there's nothing to unlock
// into yet regardless of what came before it. Otherwise: the first group
// is always open, and any later group opens once every published lesson
// in the PREVIOUS group (across all its steps) is completed.
function groupState(group: LessonGroup, index: number, groups: LessonGroup[], completed: Set<string>): NodeState {
  if (!group.is_published) return "soon";
  const ownLessons = group.steps.flatMap((s) => s.lessons);
  if (isLessonSetDone(ownLessons, completed)) return "done";
  if (index === 0) return "unlocked";
  const prevLessons = groups[index - 1].steps.flatMap((s) => s.lessons);
  return isLessonSetDone(prevLessons, completed) ? "unlocked" : "locked";
}

// Same idea one level down: a step with zero published lessons is "coming
// soon" regardless of order; otherwise the first step in a group is
// always open, later steps open once the previous step's lessons are done.
function stepState(step: LessonStep, index: number, steps: LessonStep[], completed: Set<string>): NodeState {
  if (!step.lessons.length) return "soon";
  if (isLessonSetDone(step.lessons, completed)) return "done";
  if (index === 0) return "unlocked";
  return isLessonSetDone(steps[index - 1].lessons, completed) ? "unlocked" : "locked";
}

function IconCap({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 10v6" />
    </svg>
  );
}
function IconLayer({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" />
    </svg>
  );
}
function IconCheck({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconLock({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button onClick={onBack} style={{
      alignSelf: "flex-start", background: "none", border: "none", color: B.blue, cursor: "pointer",
      fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: 0, display: "flex", alignItems: "center", gap: 4,
    }}>
      ← {label}
    </button>
  );
}

function PathNode({ label, sub, state, onClick, icon }: { label: string; sub: string; state: NodeState; onClick: () => void; icon: JSX.Element }) {
  const clickable = state === "unlocked" || state === "done";
  const circleBg = state === "done" ? B.green : state === "unlocked" ? B.blue : B.panel2;
  const circleBorder = state === "done" ? B.green : state === "unlocked" ? B.blue : B.border;
  const iconColor = state === "locked" || state === "soon" ? B.gray3 : B.white;
  return (
    <button onClick={onClick} disabled={!clickable} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      background: "none", border: "none", padding: "6px 10px", width: "100%", maxWidth: 200,
      cursor: clickable ? "pointer" : "default",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: circleBg, border: `2px solid ${circleBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0,
        boxShadow: state === "unlocked" ? `0 0 0 4px rgba(0,102,255,0.15)` : "none",
        opacity: state === "soon" ? 0.55 : 1,
      }}>
        {state === "done" ? <IconCheck /> : state === "locked" ? <IconLock /> : icon}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: state === "soon" ? B.gray3 : B.gray1, fontFamily: FONT }}>{label}</div>
        <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, letterSpacing: "0.05em", marginTop: 1, textTransform: "uppercase" }}>{sub}</div>
      </div>
    </button>
  );
}

function StreakBanner({ streak }: { streak: LearnStreak }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "14px 18px",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: B.blue, letterSpacing: "0.06em", fontFamily: FONT }}>LEARN</div>
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginTop: 2 }}>
          A guided path through investing basics — quiz style, at your own pace.
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🔥</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: B.gray1, fontFamily: FONT, lineHeight: 1 }}>{streak.current_streak}</div>
          <div style={{ fontSize: 9, color: B.gray3, fontFamily: FONT, letterSpacing: "0.06em" }}>DAY STREAK</div>
        </div>
      </div>
    </div>
  );
}

function PathMap({ groups, completed, onOpenGroup }: { groups: LessonGroup[]; completed: Set<string>; onOpenGroup: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0" }}>
      {groups.map((g, i) => {
        const state = groupState(g, i, groups, completed);
        return (
          <div key={g.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            {i > 0 && <div style={{ width: 3, height: 28, background: B.border, borderRadius: 2 }} />}
            <PathNode
              label={g.title}
              sub={state === "soon" ? "Coming soon" : `${g.steps.length} steps`}
              state={state}
              onClick={() => (state === "unlocked" || state === "done") && onOpenGroup(g.id)}
              icon={<IconCap />}
            />
          </div>
        );
      })}
    </div>
  );
}

function GroupDetail({ group, groupIndex, groups, completed, onBack, onOpenStep }: {
  group: LessonGroup; groupIndex: number; groups: LessonGroup[]; completed: Set<string>;
  onBack: () => void; onOpenStep: (id: string) => void;
}) {
  const gState = groupState(group, groupIndex, groups, completed);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackRow onBack={onBack} label="ALL GROUPS" />
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: B.blue, fontFamily: FONT }}>{group.title}</div>
        {group.description && <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginTop: 4 }}>{group.description}</div>}
      </div>
      {gState === "soon" ? (
        <div style={{ padding: 30, textAlign: "center", color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          This group's lessons aren't published yet — check back soon.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {group.steps.map((s, i) => {
            const state = stepState(s, i, group.steps, completed);
            return (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                {i > 0 && <div style={{ width: 3, height: 24, background: B.border, borderRadius: 2 }} />}
                <PathNode
                  label={s.title}
                  sub={state === "soon" ? "Coming soon" : `${s.lessons.length} lessons`}
                  state={state}
                  onClick={() => (state === "unlocked" || state === "done") && onOpenStep(s.id)}
                  icon={<IconLayer />}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepDetail({ step, group, completed, onBack, onOpenLesson }: {
  step: LessonStep; group: LessonGroup; completed: Set<string>;
  onBack: () => void; onOpenLesson: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackRow onBack={onBack} label={group.title.toUpperCase()} />
      <div style={{ fontSize: 16, fontWeight: 700, color: B.blue, fontFamily: FONT }}>{step.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {step.lessons.map((l) => {
          const done = completed.has(l.id);
          return (
            <button key={l.id} onClick={() => onOpenLesson(l.id)} style={{
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              background: B.panel, border: `1px solid ${done ? B.green : B.border}`, borderRadius: 10,
              padding: "12px 14px", cursor: "pointer",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: done ? B.green : B.panel2,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: done ? B.white : B.gray3,
              }}>
                {done ? <IconCheck size={16} /> : <IconPlay size={13} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{l.title}</div>
                <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, marginTop: 2 }}>
                  {done ? "Completed — tap to review" : "Not started"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonView({ lesson, onBack, onDone, onNext }: {
  lesson: Lesson; onBack: () => void;
  onDone: (lesson: Lesson, correct: boolean) => void;
  onNext: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => { setRevealed(false); setSelected(null); }, [lesson.id]);

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    onDone(lesson, i === lesson.correct_option_index);
  };

  const correct = selected !== null && selected === lesson.correct_option_index;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <BackRow onBack={onBack} label="BACK" />
      <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: B.blue, fontFamily: FONT, marginBottom: 10 }}>{lesson.title}</div>
        <div style={{ fontSize: 14, color: B.gray1, fontFamily: FONT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{lesson.body}</div>

        {!revealed ? (
          <button onClick={() => setRevealed(true)} style={{
            marginTop: 18, background: B.blue, border: "none", color: B.white, padding: "10px 22px", borderRadius: 8,
            fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Continue
          </button>
        ) : (
          <div style={{ marginTop: 18, borderTop: `1px solid ${B.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 10 }}>{lesson.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lesson.options.map((opt, i) => {
                const isCorrect = i === lesson.correct_option_index;
                const isPicked = selected === i;
                let bg = B.panel2, border = B.border, color = B.gray1;
                if (selected !== null) {
                  if (isCorrect) { bg = "rgba(0,200,120,0.12)"; border = B.green; color = B.green; }
                  else if (isPicked) { bg = "rgba(255,51,51,0.1)"; border = B.red; color = B.red; }
                }
                return (
                  <button key={i} onClick={() => choose(i)} disabled={selected !== null} style={{
                    textAlign: "left", padding: "11px 14px", background: bg, border: `1px solid ${border}`, color,
                    borderRadius: 8, fontFamily: FONT, fontSize: 13, cursor: selected === null ? "pointer" : "default",
                  }}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div style={{
                marginTop: 14, padding: "12px 14px", borderRadius: 8,
                background: correct ? "rgba(0,200,120,0.08)" : "rgba(255,51,51,0.08)",
                border: `1px solid ${correct ? B.green : B.red}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: correct ? B.green : B.red, fontFamily: FONT }}>
                  {correct ? "Correct!" : "Not quite."}
                </div>
                {!correct && (
                  <div style={{ fontSize: 12, color: B.gray1, fontFamily: FONT, marginTop: 6, lineHeight: 1.5 }}>
                    The correct answer was: <b>{lesson.options[lesson.correct_option_index]}</b>
                  </div>
                )}
                <button onClick={onNext} style={{
                  marginTop: 10, background: correct ? B.green : B.blue, border: "none", color: B.white,
                  padding: "9px 20px", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearnPage() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<LessonGroup[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState<LearnStreak>({ current_streak: 0, longest_streak: 0, last_activity_date: null });

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const d = await getLearnData();
        if (!alive) return;
        setGroups(d.groups);
        setCompletedIds(new Set(d.completedLessonIds));
        setStreak(d.streak);
      } catch (e: any) {
        if (alive) setError(e.message || "Could not load lessons.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const groupIndex = groups.findIndex((g) => g.id === activeGroupId);
  const activeGroup = groupIndex >= 0 ? groups[groupIndex] : null;
  const activeStep = activeGroup?.steps.find((s) => s.id === activeStepId) || null;
  const activeLesson = activeStep?.lessons.find((l) => l.id === activeLessonId) || null;

  // Keeps the UI responsive (progress checkmark, streak) even if the save
  // call itself fails — a failed background save shouldn't block someone
  // from continuing through the lesson they just finished.
  const handleLessonDone = async (lesson: Lesson, correct: boolean) => {
    setCompletedIds((prev) => new Set(prev).add(lesson.id));
    try {
      const newStreak = await completeLesson({ data: { lessonId: lesson.id, correctOnFirstTry: correct } });
      setStreak(newStreak);
    } catch { /* progress still reflected locally; will resync next load */ }
  };

  const goNextLesson = () => {
    if (!activeStep || !activeLesson) return;
    const idx = activeStep.lessons.findIndex((l) => l.id === activeLesson.id);
    const next = activeStep.lessons[idx + 1];
    setActiveLessonId(next ? next.id : null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
      LOADING…
    </div>
  );
  if (error) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: B.red, fontFamily: FONT, fontSize: 13, padding: 30, textAlign: "center" }}>
      {error}
    </div>
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px 24px" : "16px 24px 32px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <StreakBanner streak={streak} />
        {activeLesson && activeStep ? (
          <LessonView lesson={activeLesson} onBack={() => setActiveLessonId(null)} onDone={handleLessonDone} onNext={goNextLesson} />
        ) : activeStep && activeGroup ? (
          <StepDetail step={activeStep} group={activeGroup} completed={completedIds} onBack={() => setActiveStepId(null)} onOpenLesson={setActiveLessonId} />
        ) : activeGroup ? (
          <GroupDetail group={activeGroup} groupIndex={groupIndex} groups={groups} completed={completedIds} onBack={() => setActiveGroupId(null)} onOpenStep={setActiveStepId} />
        ) : (
          <PathMap groups={groups} completed={completedIds} onOpenGroup={setActiveGroupId} />
        )}
      </div>
    </div>
  );
}
