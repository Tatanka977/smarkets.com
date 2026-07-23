import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PortfolioTerminal from "@/components/PortfolioTerminal";
import OnboardingQuestionnaire from "@/components/OnboardingQuestionnaire";
import { useUser } from "@/hooks/useUser";
import { getInvestorProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/terminal")({
  component: TerminalWithOnboarding,
});

function TerminalWithOnboarding() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Require login before allowing access to the terminal at all.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    getInvestorProfile().then(profile => {
      const done = profile && (profile.onboarding_skipped || profile.investment_goal);
      setShowOnboarding(!done);
      setChecked(true);
    }).catch(() => setChecked(true));
  }, [user, loading, navigate]);

  // While we're checking auth state, or redirecting an unauthenticated user, show nothing (or a simple loader) instead of the terminal.
  if (loading || !user) {
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
      <PortfolioTerminal />
      {checked && showOnboarding && (
        <OnboardingQuestionnaire onDone={() => setShowOnboarding(false)} />
      )}
    </>
  );
}
