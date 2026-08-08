import { useState, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import "./LandingPage.css";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { batchRefresh as srvBatchRefresh } from "@/lib/finance.functions";
import { listBlogPosts, type BlogPost } from "@/lib/blog.functions";

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
const FEATURE_ICONS: Record<string, JSX.Element> = {
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
  ai: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4Z" />
    </svg>
  ),
};

// The 4 highlight sections, in the order they appear on the page.
const HIGHLIGHTS: { id: string; label: string; title: string; desc: string; shot: string }[] = [
  {
    id: "highlight-portfolio", label: "Portfolio", shot: "portfolio.png",
    title: "Build a real portfolio, not a spreadsheet.",
    desc: "Add real stocks, ETFs, bonds, crypto, REITs and FX at their live price. Import or export via CSV, track cost basis and buy dates, and see multi-currency positions valued correctly.",
  },
  {
    id: "highlight-analysis", label: "Analysis", shot: "analysis.png",
    title: "See what's actually driving your risk.",
    desc: "Sector and geographic allocation with ETF look-through, single-name concentration, Sharpe and Sortino, drawdown, and a What-If simulator for hypothetical trades before you make them.",
  },
  {
    id: "highlight-ai", label: "AI Advisor", shot: "ai-advisor.png",
    title: "Ask what a number actually means.",
    desc: "A chat assistant with live access to your simulated portfolio — explains concentration, volatility, or a metric like Sharpe ratio in plain language. Educational only, never personalized advice.",
  },
  {
    id: "highlight-community", label: "Community", shot: "community.png",
    title: "Compare notes with other portfolios.",
    desc: "Share a snapshot of your portfolio, get feedback in the comments, and see how your risk score compares to everyone else who's shared theirs.",
  },
];

// Browser-window-style placeholder frame for a real screenshot that isn't
// loaded yet — a title bar with 3 dots plus an honest "screenshot coming
// soon" placeholder, never fake UI content pretending to be the app.
// `src` is a plain /public path (e.g. "/portfolio.png"), not a bundled
// import — drop a file with that name directly under public/ and it starts
// showing automatically, no code change needed. Until the file exists, the
// <img> 404s, onError fires, and the honest icon+caption placeholder shows
// instead — so this never breaks the build or shows a broken-image icon
// while screenshots are still pending.
function MockupFrame({ src, icon, label }: { src: string; icon: JSX.Element; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="mockup-frame">
      <div className="mockup-titlebar">
        <span className="mockup-dot" /><span className="mockup-dot" /><span className="mockup-dot" />
      </div>
      <div className="mockup-body">
        {!failed ? (
          <img src={src} alt={label} className="mockup-image" onError={() => setFailed(true)} />
        ) : (
          <>
            <div className="mockup-icon">{icon}</div>
            <span className="mockup-caption">Screenshot coming soon — {label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [posts, setPosts] = useState<BlogPost[]>([]);

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

  useEffect(() => {
    let alive = true;
    listBlogPosts().then((list) => { if (alive) setPosts(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const anchorClick = (id: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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

      {/* HERO — headline + a placeholder "window" on the right, CTA, live
          ticker. Scrolls straight into the first HIGHLIGHTS section below
          (no product tour / feature grid between them anymore — cut per
          feedback that it was too much before reaching the actual feature
          content). */}
      <section className="home-hero" id="home">
        <div className="hero-intro">
          <div className="container hero-intro-grid">
            <div>
              <span className="eyebrow">Portfolio Analytics Terminal</span>

              <h1 className="home-hero-headline">
                Track markets.
                <br />
                Test strategy.
                <br />
                Learn what <span className="accent">actually</span> drives risk.
              </h1>

              <div className="hero-cta-row">
                <a href="/terminal" className="btn glow-btn-primary">
                  Open Terminal <span className="btn-arrow">→</span>
                </a>
                <a href="#highlight-portfolio" className="btn-text" onClick={anchorClick("highlight-portfolio")}>
                  See how it works <span className="btn-arrow">→</span>
                </a>
              </div>
            </div>

            <div className="hero-visual">
              {/* Drop a real screenshot at public/hero.png — it starts
                  showing automatically, no code change needed. */}
              <MockupFrame src="/hero.png" icon={FEATURE_ICONS.home} label="Terminal overview" />
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
      </section>

      {/* HIGHLIGHTS — 4 alternating text/mockup sections, straight after the
          hero. Mockups are placeholder frames only — real screenshots to
          be dropped in at the paths noted above each one. */}
      {HIGHLIGHTS.map((h, i) => (
        <section key={h.id} id={h.id} className={`highlight${i % 2 === 1 ? " highlight--reverse" : ""}`}>
          <div className="container highlight-row">
            <div className="highlight-text">
              <span className="card-label">{h.label}</span>
              <h3>{h.title}</h3>
              <p>{h.desc}</p>
              <a href="/terminal" className="btn-text">
                Try it in the terminal <span className="btn-arrow">→</span>
              </a>
            </div>
            <div className="highlight-visual">
              {/* Drop a real screenshot at public/{h.shot} — it starts
                  showing automatically, no code change needed. */}
              <MockupFrame src={`/${h.shot}`} icon={FEATURE_ICONS[h.id.replace("highlight-", "")]} label={h.label} />
            </div>
          </div>
        </section>
      ))}

      {/* TRUST — only verifiable facts, no invented survey/satisfaction stats. */}
      <section className="trust">
        <div className="container trust-row">
          <div className="trust-stat">
            <div className="trust-value">7+</div>
            <div className="trust-label">Asset classes — stocks, ETFs, bonds, crypto, commodities, REITs, FX</div>
          </div>
          <div className="trust-stat">
            <div className="trust-value">Live</div>
            <div className="trust-label">Market data, not delayed or simulated prices</div>
          </div>
          <div className="trust-stat">
            <div className="trust-value">$0</div>
            <div className="trust-label">Real money at risk — it's an educational simulation</div>
          </div>
          <div className="trust-stat">
            <div className="trust-value">Free</div>
            <div className="trust-label">To start, no card required</div>
          </div>
        </div>
      </section>

      {/* BLOG GRID — real posts via listBlogPosts(), same data blog.tsx uses.
          Renders nothing if there are no posts yet, rather than an empty
          section with a heading and no content. */}
      {posts.length > 0 && (
        <section className="home-insights" id="insights">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">From the blog</span>
              <h2>Notes on markets, risk, and building Strategic Markets.</h2>
            </div>
            <div className="insights-grid">
              {posts.slice(0, 4).map((post) => (
                <a key={post.id} href={`/blog/${post.slug}`} className="insight-card">
                  <span className="insight-date">
                    {new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT — a mailto link, not an enterprise lead-capture form; this
          is a free self-serve product, not a B2B sale. */}
      <section className="contact">
        <div className="container contact-row">
          <div>
            <h2>Questions?</h2>
            <p>Reach out and we'll get back to you.</p>
          </div>
          <a href="mailto:info@s-markets.com" className="btn glow-btn-primary">
            info@s-markets.com
          </a>
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
