import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing">

      {/* NAVBAR */}
      <header className="header">
        <div className="container nav">

          <div className="logo">
            <span className="logo-accent">Strategic</span> <span className="logo-muted">Markets</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="/blog" className="nav-link">
              Blog
            </a>
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

              <a href="#features" className="btn btn-secondary">
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

              <div className="terminal-header">
                Portfolio Terminal
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
