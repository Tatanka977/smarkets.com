import "./LandingPage.css";
import { useTheme } from "@/hooks/useTheme";

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  return (
    <div className="landing">

      {/* AMBIENT BACKGROUND */}
      <div className="glow glow-blue" />
      <div className="glow glow-purple" />
      <div className="glow glow-green" />
      <div className="grid-overlay" />

      {/* NAVBAR */}
      <header className="header">
        <div className="container nav">

          <div className="logo">
            <span className="logo-accent">Strategic</span> <span className="logo-muted">Markets</span>
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
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%", width: 34, height: 34, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {isAurora ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:"#0f172a"}}>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:"#f1f5f9"}}>
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

          <div className="hero-content">

            <span className="badge">AI-POWERED INVESTING PLATFORM</span>

            <h1>
              Smarter investing.
              <br />
              <span className="accent">Powered</span> by AI.
            </h1>

            <p>
              Strategic Markets gives investors a powerful portfolio
              terminal with multi-asset coverage, analytics and AI
              investment insights.
            </p>

            <div className="hero-buttons">

              <a href="/terminal" className="btn btn-primary">
                Launch Platform <span className="btn-arrow">→</span>
              </a>

              href="#features"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn More
              </a>

            </div>

            <div className="stats">

              <div className="stat">
                <div className="stat-icon stat-icon-blue">🌐</div>
                <div>
                  <h2>7+</h2>
                  <span>Asset classes covered</span>
                </div>
              </div>

              <div className="stat">
                <div className="stat-icon stat-icon-blue">🎁</div>
                <div>
                  <h2>Free</h2>
                  <span>To get started</span>
                </div>
              </div>

              <div className="stat">
                <div className="stat-icon stat-icon-purple">✨</div>
                <div>
                  <h2>AI</h2>
                  <span>Portfolio insights</span>
                </div>
              </div>

            </div>

          </div>

          <div className="hero-card">

            <div className="terminal">

              <div className="terminal-dots">
                <span />
                <span />
                <span />
              </div>

              <div className="terminal-header">
                Portfolio Terminal
                <span className="live-dot" />
              </div>

              <div className="chart">
  <svg
    viewBox="0 0 500 180"
    className="performance-chart"
  >

    <defs>
      <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </linearGradient>
    </defs>


    {/* area sotto la linea */}
    <path
      d="
      M0 140
      C40 120, 70 130, 100 110
      C140 80, 170 100, 210 75
      C250 55, 280 90, 320 50
      C370 20, 420 45, 500 15
      L500 180
      L0 180
      Z"
      fill="url(#area)"
    />


    {/* linea crescita */}
    <path
      d="
      M0 140
      C40 120, 70 130, 100 110
      C140 80, 170 100, 210 75
      C250 55, 280 90, 320 50
      C370 20, 420 45, 500 15"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
    />


    {/* punti */}
    <circle cx="100" cy="110" r="5" fill="#22c55e"/>
    <circle cx="210" cy="75" r="5" fill="#22c55e"/>
    <circle cx="320" cy="50" r="5" fill="#22c55e"/>
    <circle cx="500" cy="15" r="5" fill="#22c55e"/>

  </svg>
</div>

              <div className="portfolio">

                <div>
                  <span>Global Equity</span>
                  <strong>+12.4%</strong>
                </div>

                <div>
                  <span>AI Strategy</span>
                  <strong>+18.9%</strong>
                </div>

                <div>
                  <span>Crypto Index</span>
                  <strong>+7.2%</strong>
                </div>

              </div>

            </div>

          </div>


        </div>
      </section>



      {/* FEATURES */}
      <section className="features" id="features">

        <div className="container">

          <div className="section-title">

            <span className="eyebrow">EVERYTHING INVESTORS NEED</span>

            <h2>
              Powerful tools designed for modern portfolio management.
            </h2>

          </div>


          <div className="cards">


            <div className="card">

              <div className="icon icon-orange">
                ⚡
              </div>

              <h2>
                AI Advisor
              </h2>

              <p>
                Get intelligent market analysis and portfolio suggestions.
              </p>

            </div>



            <div className="card">

              <div className="icon icon-blue">
                📊
              </div>

              <h2>
                Multi Asset Analytics
              </h2>

              <p>
                Track equities, crypto, commodities and alternative assets.
              </p>

            </div>



            <div className="card">

              <div className="icon icon-green">
                🔒
              </div>

              <h2>
                Secure Platform
              </h2>

              <p>
                Built on Supabase with row-level security, so your data stays yours.
              </p>

            </div>


          </div>

        </div>

      </section>



      {/* CTA */}

      <section className="cta">

        <div className="container">

          <h2>
            Ready to analyze the markets?
          </h2>


          <p>
            Access powerful analytics, AI insights and real-time data.
          </p>


          <a href="/terminal" className="btn btn-white">
            Open Terminal <span className="btn-arrow">→</span>
          </a>


        </div>

      </section>



      <footer>
        <div className="container footer-grid">
          <div className="logo footer-logo">
            <span className="logo-accent">Strategic</span> <span className="logo-muted-footer">Markets</span>
          </div>

          <div className="footer-copy">© 2026 Strategic Markets. All rights reserved.</div>

          <div className="footer-links">
            <a href="/disclaimer">Privacy</a>
            <a href="/disclaimer">Terms</a>
            <a href="mailto:hello@s-markets.com">Contact</a>
          </div>
        </div>
      </footer>


    </div>
  );
}
