import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import "./LandingPage.css";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";

// A single ascending, zigzagging line — same silhouette as a real stock
// chart, not a smooth curve — drawn across a 500x320 viewBox. Waypoint
// anchors below reuse these exact coordinates so each callout badge sits
// right on the line at the point it "arrives" at, rather than at an
// arbitrary position that happens to drift out of sync if the path ever
// changes.
const CHART_VIEWBOX = "0 0 500 320";
const CHART_PATH = "M20,290 L60,260 L140,210 L190,240 L270,150 L310,180 L390,95 L420,120 L480,40";

// Real, shipped features only — no mention of backtesting, which was
// removed from the app earlier and isn't a current feature. Each
// scroll-progress range is where that waypoint fades/slides in; ranges
// are spaced with gaps between them so callouts don't fight for the same
// slice of scroll, and stay spread across the whole scrollable height.
const WAYPOINTS = [
  { label: "Live Market Data", x: 140, y: 210, start: 0.15, end: 0.25 },
  { label: "AI Portfolio Advisor", x: 270, y: 150, start: 0.35, end: 0.45 },
  { label: "Community & Sharing", x: 390, y: 95, start: 0.55, end: 0.65 },
  { label: "Risk & Performance Analysis", x: 480, y: 40, start: 0.72, end: 0.82 },
] as const;

function HeroChart({ pathLength, dotOpacity, waypointMotion }: {
  pathLength: any;
  dotOpacity: any;
  waypointMotion: { opacity: any; y: any }[];
}) {
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return (
    <div className="hero-chart-wrap">
      <svg className="hero-chart-svg" viewBox={CHART_VIEWBOX} fill="none">
        <motion.path
          d={CHART_PATH}
          stroke="var(--sm-green)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength }}
        />
        <motion.circle cx={last.x} cy={last.y} r="5" fill="var(--sm-green)" style={{ opacity: dotOpacity }} />
      </svg>
      {WAYPOINTS.map((w, i) => (
        <motion.div
          key={w.label}
          className="hero-waypoint"
          style={{
            left: `${(w.x / 500) * 100}%`,
            top: `${(w.y / 320) * 100}%`,
            opacity: waypointMotion[i].opacity,
            y: waypointMotion[i].y,
          }}
        >
          <span className="hero-waypoint-dot" />
          {w.label}
        </motion.div>
      ))}
    </div>
  );
}

function HeroCopy() {
  return (
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
  );
}

const scrollToFeatures = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
};

// Reduced-motion / no-scroll-tracking fallback: the exact same content
// (copy, chart, waypoints, buttons) laid out normally and all visible at
// once — no tall scroll container, no scroll-linked animation at all,
// per prefers-reduced-motion rather than just disabling the drawing
// effect but still forcing the extra scroll distance on the user.
function StaticHero() {
  const doneMotion = { opacity: 1, y: 0 };
  return (
    <section className="hero hero-static" id="home">
      <div className="container hero-grid">
        <HeroCopy />
        <HeroChart pathLength={1} dotOpacity={1} waypointMotion={[doneMotion, doneMotion, doneMotion, doneMotion]} />
      </div>
      <div className="container hero-final-buttons">
        <a href="/terminal" className="btn btn-primary">
          Open Terminal <span className="btn-arrow">→</span>
        </a>
        <a href="#features" className="btn btn-secondary" onClick={scrollToFeatures}>
          Learn more
        </a>
      </div>
    </section>
  );
}

function ScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Drawing finishes a bit before the scroll itself does (85%), leaving
  // room for the final buttons to reveal after the line is fully drawn
  // rather than competing with it.
  const pathLength = useTransform(scrollYProgress, [0.05, 0.85], [0, 1]);
  const dotOpacity = useTransform(scrollYProgress, [0.78, 0.86], [0, 1]);

  // One useTransform pair per waypoint — a fixed, static-length array
  // (WAYPOINTS never changes shape), so this doesn't call hooks
  // conditionally or in a variable-length loop.
  const wp0Opacity = useTransform(scrollYProgress, [WAYPOINTS[0].start, WAYPOINTS[0].end], [0, 1]);
  const wp0Y = useTransform(scrollYProgress, [WAYPOINTS[0].start, WAYPOINTS[0].end], [16, 0]);
  const wp1Opacity = useTransform(scrollYProgress, [WAYPOINTS[1].start, WAYPOINTS[1].end], [0, 1]);
  const wp1Y = useTransform(scrollYProgress, [WAYPOINTS[1].start, WAYPOINTS[1].end], [16, 0]);
  const wp2Opacity = useTransform(scrollYProgress, [WAYPOINTS[2].start, WAYPOINTS[2].end], [0, 1]);
  const wp2Y = useTransform(scrollYProgress, [WAYPOINTS[2].start, WAYPOINTS[2].end], [16, 0]);
  const wp3Opacity = useTransform(scrollYProgress, [WAYPOINTS[3].start, WAYPOINTS[3].end], [0, 1]);
  const wp3Y = useTransform(scrollYProgress, [WAYPOINTS[3].start, WAYPOINTS[3].end], [16, 0]);
  const waypointMotion = [
    { opacity: wp0Opacity, y: wp0Y },
    { opacity: wp1Opacity, y: wp1Y },
    { opacity: wp2Opacity, y: wp2Y },
    { opacity: wp3Opacity, y: wp3Y },
  ];

  const buttonsOpacity = useTransform(scrollYProgress, [0.88, 0.97], [0, 1]);
  const buttonsY = useTransform(scrollYProgress, [0.88, 0.97], [20, 0]);

  return (
    <section ref={containerRef} className="hero-scroll" id="home" style={{ height: isMobile ? "180vh" : "280vh" }}>
      <div className="hero-sticky hero">
        <div className="container hero-grid">
          <HeroCopy />
          <HeroChart pathLength={pathLength} dotOpacity={dotOpacity} waypointMotion={waypointMotion} />
        </div>

        <motion.div className="container hero-final-buttons" style={{ opacity: buttonsOpacity, y: buttonsY }}>
          <a href="/terminal" className="btn btn-primary">
            Open Terminal <span className="btn-arrow">→</span>
          </a>
          <a href="#features" className="btn btn-secondary" onClick={scrollToFeatures}>
            Learn more
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  // Called unconditionally at the top level (rules of hooks) — the actual
  // branch on its value lives one level down, inside the return below.
  const prefersReducedMotion = useReducedMotion();

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

      {/* HERO — scrollytelling on the line chart when motion is welcome,
          a fully static equivalent when prefers-reduced-motion is on. */}
      {prefersReducedMotion ? <StaticHero /> : <ScrollHero />}

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
              <h2>Risk, not just returns</h2>
              <p>
                Sharpe, Sortino, drawdown, sector/geo concentration, and
                single-name risk with ETF look-through — see what's
                actually driving your risk.
              </p>
            </div>

            <div className="card">
              <div className="card-label">Coverage</div>
              <h2>Stocks, ETFs, bonds, crypto &amp; FX</h2>
              <p>
                Search and track multi-asset positions with live quotes
                and multi-currency valuation.
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
