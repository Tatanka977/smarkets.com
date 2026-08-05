import { useState, useEffect, useRef } from "react";
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

// Same 24x24 stroke icons as NAV_ICONS in PortfolioTerminal.tsx (copied
// rather than imported, so the marketing bundle doesn't pull in that whole
// component's module graph — Supabase clients, chart libs, etc. — just for
// 7 SVGs). Keep these in sync by hand if NAV_ICONS' paths ever change.
const TOUR_ICONS: Record<string, JSX.Element> = {
  home: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" />
    </svg>
  ),
  search: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  portfolio: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  analysis: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-4 4" />
    </svg>
  ),
  community: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  news: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  ),
  learn: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" /><path d="M22 10v6" />
    </svg>
  ),
};

// Verbatim against what each page actually does (checked against
// HomePage.tsx, SearchPage/PortfolioPage/AIAdvisorPage/NewsPage in
// PortfolioTerminal.tsx, AnalysisPage.tsx, CommunityPage.tsx, LearnPage.tsx)
// — no feature described here is invented.
const TOUR_STOPS = [
  { id: "home", title: "Home", desc: "See everything at a glance. Live indices, your portfolio overview, and market status in one place." },
  { id: "search", title: "Search", desc: "Search any stock, ETF, crypto, bond, or commodity — with real-time quotes and company data." },
  { id: "portfolio", title: "Portfolio", desc: "Build your portfolio, track real positions, and see your true risk exposure." },
  { id: "analysis", title: "Analysis", desc: "Go deep: allocation breakdown, risk scoring, performance history, and What-If scenarios." },
  { id: "community", title: "Community", desc: "Share your portfolio, get feedback, and see how others are investing." },
  { id: "news", title: "News", desc: "Stay informed with real-time market news, filtered to what matters to your holdings." },
  { id: "learn", title: "Learn", desc: "Build real financial literacy with bite-sized lessons and daily streaks." },
];

// Scrollytelling driver: a sticky icon panel stays pinned while the user
// scrolls past 7 tall text blocks on the other side; whichever block sits
// in a thin band near the vertical center of the viewport becomes "active"
// (native IntersectionObserver, no animation library). Desktop-only — see
// the .tour-block-icon mobile fallback in LandingPage.css for narrow
// screens, where sticky-tracking doesn't make sense.
function useScrollyActive(count: number) {
  const [active, setActive] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = blockRefs.current.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1) setActive(idx);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    blockRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
  return { active, blockRefs };
}

function MiniBars() {
  const bars = [18, 30, 24, 42, 36];
  return (
    <svg viewBox="0 0 80 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {bars.map((h, i) => (
        <rect key={i} x={i * 16 + 4} y={46 - h} width="10" height={h} rx="2" fill="var(--sm-blueL)" opacity={0.55 + i * 0.09} />
      ))}
    </svg>
  );
}

function MiniDonut() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[1]} strokeWidth="14" strokeDasharray="110 226" strokeDashoffset="0" transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[8]} strokeWidth="14" strokeDasharray="70 226" strokeDashoffset="-110" transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r="36" fill="none" stroke={PIE_COLS[6]} strokeWidth="14" strokeDasharray="46 226" strokeDashoffset="-180" transform="rotate(-90 50 50)" />
    </svg>
  );
}

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const { active, blockRefs } = useScrollyActive(TOUR_STOPS.length);

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

      {/* HERO — headline up top, then the product tour scrollytelling
          flows directly underneath in the same section: a sticky icon
          panel on the right stays pinned while 7 tall text blocks scroll
          past on the left. This replaces what used to be 4 static floating
          decorative icons with something that actually means something —
          the icon on the right updates to match whichever real feature
          you're currently reading about. */}
      <section className="home-hero" id="home">
        <div className="hero-intro">
          <div className="container">
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
                href="#tour"
                className="btn-text"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("tour")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See how it works <span className="btn-arrow">→</span>
              </a>
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
        </div>

        {/* PRODUCT TOUR — see TOUR_STOPS/useScrollyActive above. */}
        <div className="container tour" id="tour">
          <div className="section-title">
            <span className="eyebrow">Product tour</span>
            <h2>One terminal, seven ways to understand your portfolio.</h2>
          </div>

          <div className="tour-scrolly">
            <div className="tour-scroll-col">
              {TOUR_STOPS.map((stop, i) => (
                <div
                  key={stop.id}
                  ref={(el) => { blockRefs.current[i] = el; }}
                  className={`tour-block${i === active ? " active" : ""}`}
                >
                  <div className="tour-block-icon">{TOUR_ICONS[stop.id]}</div>
                  <span className="card-label">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{stop.title}</h3>
                  <p>{stop.desc}</p>
                </div>
              ))}

              <div className="tour-cta">
                <a href="/terminal" className="btn glow-btn-primary">
                  Start your journey — Open Terminal <span className="btn-arrow">→</span>
                </a>
              </div>
            </div>

            <div className="tour-sticky-col">
              <div className="tour-sticky-panel">
                <div className="tour-sticky-icon">{TOUR_ICONS[TOUR_STOPS[active].id]}</div>
                {TOUR_STOPS[active].id === "portfolio" && <div className="tour-chart"><MiniDonut /></div>}
                {TOUR_STOPS[active].id === "analysis" && <div className="tour-chart"><MiniBars /></div>}
                <div className="tour-sticky-index">{String(active + 1).padStart(2, "0")} / {String(TOUR_STOPS.length).padStart(2, "0")}</div>
                <div className="tour-sticky-title">{TOUR_STOPS[active].title}</div>
                <div className="tour-progress-rail">
                  {TOUR_STOPS.map((s, i) => (
                    <span key={s.id} className={`tour-dot${i === active ? " active" : ""}`} />
                  ))}
                </div>
              </div>
            </div>
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
          <a href="/terminal" className="btn glow-btn-primary">
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
