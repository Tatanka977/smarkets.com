import { createFileRoute } from "@tanstack/react-router";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import "../LandingPage.css";

const TITLE = "About Strategic Markets";
const DESCRIPTION = "What Strategic Markets is, why it was built, and who it's for — an educational portfolio simulator with real market data, risk analysis, and an AI assistant.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Strategic Markets` },
      { name: "description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://s-markets.com/about" }],
  }),
  component: AboutPage,
});

function ThemeToggle() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  return (
    <button
      onClick={toggleTheme}
      title={isAurora ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle light/dark mode"
      style={{
        background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "50%", width: 34, height: 34, cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {isAurora ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function AboutPage() {
  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <LogoWithText />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/blog" className="nav-link">Blog</a>
            <ThemeToggle />
            <a className="btn btn-primary" href="/terminal">
              Open Terminal <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </header>

      <section className="hero" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <span className="badge">ABOUT</span>
          <h1 style={{ fontSize: 42, marginBottom: 12 }}>What Strategic Markets is, and why it exists</h1>
        </div>
      </section>

      <section style={{ paddingBottom: 100 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: 16, lineHeight: 1.75, color: "var(--sm-gray1)" }}>
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>What it is</h2>
              <p style={{ margin: 0, color: "var(--sm-gray2)" }}>
                Strategic Markets is an educational portfolio simulator. You build a portfolio out of
                real stocks, ETFs, bonds, commodities, crypto, REITs and FX positions, priced with live
                market data — but no real money ever moves and it isn't connected to any real brokerage
                account. Alongside the simulator, the app gives you risk and performance analytics, an
                AI assistant to help make sense of the numbers, a community to discuss portfolios and
                strategies, and a guided "Learn" path covering investing fundamentals.
              </p>
            </div>

            <div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Why it was built</h2>
              <p style={{ margin: 0, color: "var(--sm-gray2)" }}>
                Most places to learn about investing are either surface-level articles or a real
                brokerage account where mistakes cost actual money. We wanted something in between: a
                place where you can actually build a diversified portfolio, watch how concentration,
                volatility, and asset allocation play out with real prices, and ask an AI assistant to
                explain what a metric like Sharpe ratio or sector concentration actually means for the
                portfolio in front of you — without any of it being, or pretending to be, personalized
                financial advice.
              </p>
            </div>

            <div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Who it's for</h2>
              <p style={{ margin: 0, color: "var(--sm-gray2)" }}>
                Anyone learning how markets and portfolios actually work: people new to investing who
                want a low-stakes way to practice, students studying finance, hobbyists who like
                tracking a hypothetical portfolio, or anyone who wants a clearer, hands-on sense of risk
                and diversification before — or alongside — using a real brokerage account.
              </p>
            </div>

            <div style={{ paddingTop: 8 }}>
              <a href="/terminal" className="btn btn-primary">
                Open Terminal <span className="btn-arrow">→</span>
              </a>
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
