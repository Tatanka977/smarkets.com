import { useState, useEffect } from "react";
import "./LandingPage.css";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { batchRefresh as srvBatchRefresh } from "@/lib/finance.functions";
import { PIE_COLS } from "@/lib/uiShared";

// All STOCK/ETF category tickers, which always resolve to a real Finnhub-
// or-Yahoo quote (never the fake ticker-derived mock price) — see
// fetchQuote/batchRefresh in finance.functions.ts. Feeds the hero ticker
// tape; kept short since it's rendered twice back-to-back for the marquee loop.
const LANDING_TICKERS: { ticker: string; label?: string }[] = [
  { ticker: "AAPL" }, { ticker: "MSFT" }, { ticker: "NVDA" }, { ticker: "TSLA" },
  { ticker: "SPY" }, { ticker: "QQQ" }, { ticker: "JPM" }, { ticker: "BTC-USD", label: "BTC" },
];

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  const [quotes, setQuotes] = useState<Record<string, any>>({});

  useEffect(() => {
    let alive = true;
    srvBatchRefresh({ data: { symbols: LANDING_TICKERS.map((t) => t.ticker) } })
      .then((list: any) => {
        if (!alive) return;
        setQuotes(Object.fromEntries((list || []).map((q: any) => [q.symbol, q])));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="landing home-landing">

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
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%", width: 32, height: 32, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: "#F8FAFC",
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
            <a className="btn glow-btn-primary" href="/terminal">
              Open Terminal <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="home-hero" id="home">
        <div className="container home-hero-grid">
          <div>
            <span className="eyebrow">Portfolio Analytics Terminal</span>

            <h1 className="home-hero-headline">
              Track markets.
              <br />
              Test strategy.
              <br />
              Learn what <span className="accent">actually</span> drives risk.
            </h1>

            <p className="home-hero-sub">
              Strategic Markets is an educational portfolio terminal — live quotes
              across stocks, ETFs, bonds, crypto and FX, real risk analytics, and an
              AI assistant for scenario analysis. Built to help you understand
              markets, not to give financial advice.
            </p>

            <div className="hero-cta-row">
              <a href="/terminal" className="btn glow-btn-primary">
                Open Terminal <span className="btn-arrow">→</span>
              </a>
              <a
                href="#features"
                className="btn-text"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See how it works <span className="btn-arrow">→</span>
              </a>
            </div>
          </div>

          {/* Decorative floating glass composition — illustrative only, no
              numbers asserted as real data (the live ticker tape below
              carries the actual figures). */}
          <div className="floating-composition" aria-hidden="true">
            <div className="glass-card glass-card--candles">
              <svg viewBox="0 0 120 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                {[
                  { x: 6, top: 20, h: 22, up: true }, { x: 24, top: 32, h: 14, up: false },
                  { x: 42, top: 14, h: 30, up: true }, { x: 60, top: 26, h: 18, up: false },
                  { x: 78, top: 8, h: 36, up: true }, { x: 96, top: 18, h: 24, up: true },
                ].map((c, i) => (
                  <g key={i}>
                    <line x1={c.x + 6} y1={c.top - 6} x2={c.x + 6} y2={c.top + c.h + 6}
                      stroke={c.up ? "var(--glow-green)" : "var(--glow-red)"} strokeWidth="1.5" opacity="0.7" />
                    <rect x={c.x} y={c.top} width="12" height={c.h} rx="1.5"
                      fill={c.up ? "var(--glow-green)" : "var(--glow-red)"} opacity="0.9" />
                  </g>
                ))}
              </svg>
            </div>

            <div className="glass-card glass-card--trend">
              <svg viewBox="0 0 120 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <polyline points="4,50 24,40 44,44 64,26 84,30 116,8"
                  fill="none" stroke="var(--glow-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="116" cy="8" r="4" fill="var(--glow-green)" />
              </svg>
            </div>

            <div className="glass-card glass-card--donut">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[0]} strokeWidth="14"
                  strokeDasharray="140 226" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[2]} strokeWidth="14"
                  strokeDasharray="60 226" strokeDashoffset="-140" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[4]} strokeWidth="14"
                  strokeDasharray="26 226" strokeDashoffset="-200" transform="rotate(-90 50 50)" />
              </svg>
            </div>

            <div className="glass-card glass-card--mark">
              <span>$</span>
            </div>
          </div>
        </div>

        {/* Live ticker tape — real quotes, not a mockup screenshot. Rendered
            twice back-to-back so the CSS marquee loops seamlessly; the second
            pass is aria-hidden so screen readers only hit each price once. */}
        <div className="ticker bleed" aria-label="Live market ticker">
          <div className="ticker-track">
            {[...LANDING_TICKERS, ...LANDING_TICKERS].map((t, i) => {
              const q = quotes[t.ticker];
              const price = q?.price;
              const chg = q?.dayChangePct;
              const up = chg == null || chg >= 0;
              return (
                <span className="ticker-item" key={t.ticker + i} aria-hidden={i >= LANDING_TICKERS.length}>
                  <span className="ticker-sym">{t.label || t.ticker}</span>
                  <span className="ticker-price">{price != null ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "···"}</span>
                  <span className={up ? "ticker-up" : "ticker-down"}>
                    {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "···"}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="home-features" id="features">
        <div className="container">
          <div className="section-title">
            <span className="eyebrow">What's inside</span>
            <h2>Built for understanding a portfolio, not just watching it.</h2>
          </div>

          <div className="glow-cards">
            <div className="glow-card">
              <div className="card-label">Analytics</div>
              <h3>Risk, not just returns</h3>
              <p>
                Sharpe, Sortino, drawdown, sector/geo concentration, and
                single-name risk with ETF look-through — see what's
                actually driving your risk.
              </p>
            </div>

            <div className="glow-card">
              <div className="card-label">Coverage</div>
              <h3>Stocks, ETFs, bonds, crypto &amp; FX</h3>
              <p>
                Search and track multi-asset positions with live quotes
                and multi-currency valuation.
              </p>
            </div>

            <div className="glow-card">
              <div className="card-label">AI assistant</div>
              <h3>Ask questions, get educational context</h3>
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
