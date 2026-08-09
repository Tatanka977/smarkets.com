import { createFileRoute } from "@tanstack/react-router";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import "../LandingPage.css";

const TITLE = "Pricing";
const DESCRIPTION = "Strategic Markets is free to use — multi-asset portfolio simulation, risk analysis, the AI assistant, community, and the Learn path, all at no cost.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Strategic Markets` },
      { name: "description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://s-markets.com/pricing" }],
  }),
  component: PricingPage,
});

// Every line here is a feature that actually ships today — checked
// against the app's own nav/pages, not aspirational copy.
const FREE_FEATURES = [
  "Multi-asset portfolio simulation (stocks, ETFs, bonds, commodities, crypto, REITs, FX)",
  "Live market data and quotes",
  "Risk analysis: Sharpe, Sortino, drawdown, sector/geo concentration, single-name risk with ETF look-through",
  "Performance tracking with benchmark comparison",
  "AI portfolio assistant",
  "Community: share portfolios, discuss, topic channels",
  "Learn: a guided path with quizzes and streaks",
  "Watchlist with price alerts",
  "CSV import/export and multi-currency valuation",
];

function PricingPage() {
  useTheme(); // dark-only now, no toggle — this just ensures data-theme="terminal" is set
  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <LogoWithText />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/blog" className="nav-link">Blog</a>
            <a className="btn btn-primary" href="/terminal">
              Open Terminal <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </header>

      <section className="hero" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <span className="badge">PRICING</span>
          <h1 style={{ fontSize: 42, marginBottom: 12 }}>Simple pricing: free</h1>
          <p style={{ color: "var(--sm-gray2)", fontSize: 16, maxWidth: 560 }}>
            No credit card, no trial period — everything below is available today at no cost.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: 100 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="cards" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="card-label">CURRENT PLAN</div>
              <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>Free</h2>
              <div style={{ color: "var(--sm-gray3)", fontSize: 13, marginBottom: 20 }}>$0 / forever</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {FREE_FEATURES.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.5, color: "var(--sm-gray2)" }}>
                    <span style={{ color: "var(--sm-green)", flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/terminal" className="btn btn-primary" style={{ marginTop: 24, width: "100%", justifyContent: "center" }}>
                Open Terminal <span className="btn-arrow">→</span>
              </a>
            </div>

            <div className="card" style={{ padding: 32, opacity: 0.75 }}>
              <div className="card-label">NEXT</div>
              <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>Pro</h2>
              <div style={{ color: "var(--sm-gray3)", fontSize: 13, marginBottom: 20 }}>Coming soon</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--sm-gray2)" }}>
                We're exploring a paid tier for people who want more from the terminal. Nothing is
                finalized yet, so we're not going to list features here that don't exist — check back,
                or follow the blog for updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-grid">
          <div className="logo footer-logo">
            <LogoWithText iconSize={22} textSize={16} />
          </div>
          <div className="footer-copy">© 2026 Strategic Markets. All rights reserved.</div>
          <div className="footer-links">
            <a href="/about">About</a>
            <a href="/faq">FAQ</a>
            <a href="/pricing">Pricing</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/disclaimer">Disclaimer</a>
            <a href="mailto:info@s-markets.com">Contact</a>
            <a href="mailto:support@s-markets.com">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
