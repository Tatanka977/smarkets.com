import { createFileRoute } from "@tanstack/react-router";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import "../LandingPage.css";

const TITLE = "Frequently Asked Questions";
const DESCRIPTION = "Answers to common questions about Strategic Markets — pricing, whether it's investment advice, what markets it covers, the AI assistant, and data security.";

// Honest, code-verified answers — no invented feature/pricing claims.
// Kept as plain text (not JSX) so the exact same copy can be reused for
// both the rendered <details> accordion and the FAQPage JSON-LD below,
// which Google requires to match the visible page content.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Strategic Markets free to use?",
    a: "Yes. Portfolio simulation, risk and performance analytics, the AI assistant, the community, and the Learn path are all free today — see the Pricing page for details.",
  },
  {
    q: "Is this real investment advice?",
    a: "No. Strategic Markets is an educational platform, not a licensed financial advisor. Every AI response and every risk metric is framed as educational analysis, never as a personalized recommendation to buy, sell, or hold anything. See the Disclaimer for the full regulatory notice.",
  },
  {
    q: "What markets/assets does it cover?",
    a: "Stocks, ETFs, bonds, commodities, crypto, REITs, and FX, priced with live market data from Finnhub and Yahoo Finance.",
  },
  {
    q: "How does the AI assistant work?",
    a: "It's a large-language-model assistant (with an automatic fallback provider if the primary one is unavailable) that's given a snapshot of your simulated portfolio as context. It's built with hard compliance guardrails — enforced server-side, so they can't be bypassed by a clever prompt — that keep every response educational: no personalized recommendations, no telling you to buy or sell a specific instrument, and every answer ends with a clear disclaimer.",
  },
  {
    q: "Is my data secure?",
    a: "Your account and portfolio data are stored with Supabase, protected by row-level security so only you can access your own data, and encrypted in transit. Strategic Markets never connects to a real brokerage account or handles real financial credentials. See the Privacy Policy for the full details.",
  },
  {
    q: "Can I share my portfolio with the community?",
    a: "Yes. You can post to the community with a snapshot of your simulated portfolio attached, organize discussions into topic channels, and get notified when someone replies — entirely optional, and never required to use the rest of the app.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Strategic Markets` },
      { name: "description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://s-markets.com/faq" }],
  }),
  component: FaqPage,
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

function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
          <span className="badge">FAQ</span>
          <h1 style={{ fontSize: 42, marginBottom: 12 }}>Frequently asked questions</h1>
        </div>
      </section>

      <section style={{ paddingBottom: 100 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((f) => (
              <details key={f.q} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <summary style={{
                  cursor: "pointer", padding: "18px 24px", fontSize: 16, fontWeight: 700,
                  color: "var(--sm-gray1)", listStyle: "none",
                }}>
                  {f.q}
                </summary>
                <div style={{ padding: "0 24px 20px", fontSize: 14.5, lineHeight: 1.7, color: "var(--sm-gray2)" }}>
                  {f.a}
                </div>
              </details>
            ))}
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
