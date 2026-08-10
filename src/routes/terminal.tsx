import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PortfolioTerminal from "@/components/PortfolioTerminal";
import OnboardingQuestionnaire from "@/components/OnboardingQuestionnaire";
import { useUser } from "@/hooks/useUser";
import { getInvestorProfile } from "@/lib/profile.functions";

const JUST_AUTHED_KEY = "sm_just_authed";

export const Route = createFileRoute("/terminal")({
  head: () => ({ meta: [{ title: "Strategic Markets — Terminal" }, { name: "robots", content: "noindex" }] }),
  component: TerminalWithOnboarding,
});

function TerminalWithOnboarding() {
  const { user, loading } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // No login required to reach the terminal at all anymore — Home/Search/
  // News/most of Portfolio work anonymously (see PortfolioTerminal.tsx's
  // per-page/per-action gating via RequireAuth / useAuthGuard). The only
  // thing that still needs to happen here is investor-profile onboarding,
  // and only right after an actual sign-in — not on every visit where a
  // persisted session happens to already be logged in (that would now
  // fire on a plain "was already signed in, revisited /terminal" load
  // too, which is exactly what this must NOT do).
  //
  // sessionStorage.sm_just_authed (set by auth.tsx right before every
  // sign-in path completes/hands off, cleared here) is what actually
  // distinguishes those two cases — Supabase's own onAuthStateChange
  // can't: a freshly-mounted listener reports "INITIAL_SESSION" for an
  // existing session regardless of whether that session is 2 seconds or
  // 2 weeks old, so it can't tell a just-completed login (including the
  // OAuth round-trip landing back on this exact page) from an ordinary
  // revisit with a session already on file.
  useEffect(() => {
    if (loading || !user) return;
    let justAuthed = false;
    try {
      justAuthed = sessionStorage.getItem(JUST_AUTHED_KEY) === "1";
      sessionStorage.removeItem(JUST_AUTHED_KEY);
    } catch {}
    if (!justAuthed) return;
    getInvestorProfile()
      .then((profile) => {
        const done = profile && (profile.onboarding_skipped || profile.investment_goal);
        if (!done) setShowOnboarding(true);
      })
      .catch(() => {});
  }, [user, loading]);

  // Brief loading state only while the initial session check resolves —
  // never blocks/redirects an anonymous visitor once it's done.
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000", color: "#888", fontFamily: "'Courier New', monospace", fontSize: 14,
      }}>
        Checking session...
      </div>
    );
  }

  return (
    <>
      <PortfolioTerminal onRetakeProfile={() => setShowOnboarding(true)} />
      {showOnboarding && (
        <OnboardingQuestionnaire onDone={() => setShowOnboarding(false)} />
      )}
    </>
  );
}
