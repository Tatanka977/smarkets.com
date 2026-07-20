import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing">

      {/* NAVBAR */}
      <header className="header">
        <div className="container nav">

          <div className="logo">
            Strategic Markets
          </div>

          <nav>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#about">About</a>
          </nav>

          <a className="btn btn-primary" href="/terminal">
            Open Terminal
          </a>

        </div>
      </header>


      {/* HERO */}
      <section className="hero" id="home">
        <div className="container hero-grid">

          <div className="hero-content">

            <h1>
              Smarter investing.
              <br />
              Powered by AI.
            </h1>

            <p>
              Strategic Markets gives investors a powerful portfolio
              terminal with multi-asset coverage, analytics and AI
              investment insights.
            </p>

            <div className="hero-buttons">

              <a href="/terminal" className="btn btn-primary">
                Launch Platform
              </a>

              <a href="#features" className="btn btn-secondary">
                Learn More
              </a>

            </div>


            <div className="stats">

              <div>
                <h2>50K+</h2>
                <span>Investors</span>
              </div>

              <div>
                <h2>$100M+</h2>
                <span>Assets analyzed</span>
              </div>

              <div>
                <h2>99.9%</h2>
                <span>Platform uptime</span>
              </div>

            </div>

          </div>


          <div className="hero-card">

            <div className="terminal">

              <div className="terminal-header">
                Portfolio Terminal
              </div>

              <div className="chart">
                <div className="line"></div>
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

            <h2>
              Everything investors need
            </h2>

            <p>
              Powerful tools designed for modern portfolio management.
            </p>

          </div>


          <div className="cards">


            <div className="card">

              <div className="icon">
                ⚡
              </div>

              <h3>
                AI Advisor
              </h3>

              <p>
                Get intelligent market analysis and portfolio suggestions.
              </p>

            </div>



            <div className="card">

              <div className="icon">
                📊
              </div>

              <h3>
                Multi Asset Analytics
              </h3>

              <p>
                Track equities, crypto, commodities and alternative assets.
              </p>

            </div>



            <div className="card">

              <div className="icon">
                🔒
              </div>

              <h3>
                Secure Platform
              </h3>

              <p>
                Enterprise-grade infrastructure protecting your data.
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
            Access the Strategic Markets portfolio terminal today.
          </p>


          <a href="/terminal" className="btn btn-white">
            Start Now
          </a>


        </div>

      </section>



      <footer>

        © 2026 Strategic Markets. All rights reserved.

      </footer>


    </div>
  );
}
