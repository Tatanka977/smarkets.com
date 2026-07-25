import "./LandingPage.css";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";

const MOCK_HOLDINGS = [
  { ticker: "AAPL", name: "Apple Inc.", price: "195.42", delta: "+1.20%", up: true },
  { ticker: "MSFT", name: "Microsoft Corp.", price: "421.55", delta: "+0.80%", up: true },
  { ticker: "BTC-USD", name: "Bitcoin", price: "98,450", delta: "+2.34%", up: true },
  { ticker: "TLT", name: "20Y Treasury ETF", price: "92.15", delta: "-0.42%", up: false },
];

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";

  return (
    <div className="landing">

      {/* NAVBAR */}
      <header className="header">
        <div className="container nav">
          <div className="logo">
            <LogoWithText />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/blog" className="nav-link">
              Blog
            </a>
            <button
              onClick={toggleTheme}
              title={isAurora ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle light/dark mode"
              style={{
                background: "transparent", border: "1px solid var(--sm-border)",
                borderRadius: "50%", width: 32, height: 32, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: "var(--sm-gray1)",
              }}
            >
              {isAurora ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <a className="btn btn-primary" href="/terminal">
              Open Terminal <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="container hero-grid">

          <div>
            <span className="eyebrow">Portfolio Analytics Terminal</span>

            <h1>
              Track markets. Test strategy.
              <br />
              <span className="accent">Learn what drives risk.</span>
            </h1>

            <p>
              Strategic Markets is an educational portfolio terminal — live quotes
              across stocks, ETFs, bonds, crypto and FX, real risk analytics, and an
              AI assistant for scenario analysis. Built to help you understand
              markets, not to give financial advice.
            </p>

            <div className="hero-buttons">
              <a href="/terminal" className="btn btn-primary">
                Open Terminal <span className="btn-arrow">→</span>
              </a>
              <a
                href="#features"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn more
              </a>
            </div>

            <div className="stats">
              <div>
                <div className="stat-label">Asset classes</div>
                <div className="stat-value">7+</div>
              </div>
              <div>
                <div className="stat-label">Market data</div>
                <div className="stat-value">Real-time</div>
              </div>
              <div>
                <div className="stat-label">Analysis</div>
                <div className="stat-value">AI-assisted</div>
              </div>
            </div>
          </div>

          <div className="mock-terminal">
            <div className="mock-topbar">
              <span>Strategic Markets — Portfolio</span>
              <span className="mock-live">
                <span className="mock-live-dot" /> LIVE
              </span>
            </div>
            {MOCK_HOLDINGS.map((h) => (
              <div className="mock-row" key={h.ticker}>
                <div>
                  <span className="mock-ticker">{h.ticker}</span>
                  <span className="mock-name">{h.name}</span>
                </div>
                <span className="mock-price">{h.price}</span>
                <span className={`mock-delta ${h.up ? "mock-up" : "mock-down"}`}>{h.delta}</span>
              </div>
            ))}
            <div className="mock-footer">
              <span>Educational simulation</span>
              <span>Not investment advice</span>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-title">
            <span className="eyebrow">What's inside</span>
            <h2>Built for understanding a portfolio, not just watching it.</h2>
          </div>

          <div className="cards">
            <div className="card">
              <div className="card-label">Analytics</div>
              <h2>Risk &amp; correlation, not just returns</h2>
              <p>
                Sharpe, Sortino, drawdown, sector/geo concentration and a
                correlation matrix across holdings — see what's actually
                driving your risk.
              </p>
            </div>

            <div className="card">
              <div className="card-label">Coverage</div>
              <h2>Stocks, ETFs, bonds, crypto &amp; FX</h2>
              <p>
                Search and track multi-asset positions with live quotes,
                historical backtests, and multi-currency valuation.
              </p>
            </div>

            <div className="card">
              <div className="card-label">AI assistant</div>
              <h2>Ask questions, get educational context</h2>
              <p>
                A portfolio-aware assistant that explains what the numbers
                mean — framed as education, never as personalized advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <h2>Ready to explore your portfolio?</h2>
          <p>Free to start — no brokerage connection required, just live market data and analytics.</p>
          <a href="/terminal" className="btn btn-primary">
            Open Terminal <span className="btn-arrow">→</span>
          </a>
        </div>
      </section>

      <footer>
        <div className="container footer-grid">
          <div className="logo footer-logo">
            <LogoWithText iconSize={22} textSize={16} />
          </div>

          <div className="footer-copy">© 2026 Strategic Markets. All rights reserved.</div>

          <div className="footer-links">
            <a href="/disclaimer">Privacy</a>
            <a href="/disclaimer">Terms</a>
            <a href="mailto:strat.markets@gmail.com">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
