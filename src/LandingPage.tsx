import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import "./LandingPage.css";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import HeroSEOContent from "@/components/landing/HeroSEOContent";
import Hero3DScene from "@/components/landing/Hero3DScene";

// A flat, fully-drawn version of the same ascending line used as the
// hero's visual motif — the static fallback image for anyone who can't
// or shouldn't get the 3D scene (no WebGL, prefers-reduced-motion,
// mobile). Same silhouette/coordinates regardless, just rendered once as
// plain SVG instead of a WebGL tube.
const CHART_VIEWBOX = "0 0 500 320";
const CHART_PATH = "M20,290 L60,260 L140,210 L190,240 L270,150 L310,180 L390,95 L420,120 L480,40";
const CHART_DOTS = [
  { x: 140, y: 210 },
  { x: 270, y: 150 },
  { x: 390, y: 95 },
  { x: 480, y: 40 },
];

function StaticChart() {
  return (
    <div className="hero-chart-wrap">
      <svg className="hero-chart-svg" viewBox={CHART_VIEWBOX} fill="none">
        <path d={CHART_PATH} stroke="var(--sm-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {CHART_DOTS.map((d) => (
          <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="4" fill="var(--sm-green)" />
        ))}
      </svg>
    </div>
  );
}

const scrollToFeatures = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
};

// Shown whenever the 3D scene shouldn't run: no WebGL, prefers-reduced-
// motion, or mobile (see Hero below) — real, fully visible content, not
// hidden behind anything, so nobody who can't get the 3D experience is
// ever left looking at a blank page.
function HeroFallback() {
  return (
    <section className="hero hero-static" id="home">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">Portfolio Analytics Terminal</span>
          <HeroSEOContent visuallyHidden={false} />
        </div>
        <StaticChart />
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

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// The real 3D scrollytelling experience: a tall scroll container with a
// sticky, full-viewport <Canvas> pinned behind it. The camera travels
// along (and gently orbits) an ascending 3D curve as the user scrolls
// through this section's height; feature hotspots and the final Open
// Terminal/Blog buttons are drei <Html> overlays anchored to points along
// that same curve (see Hero3DScene). The real page copy still lives in
// the DOM via HeroSEOContent — just visually hidden (.sr-only), since the
// 3D scene is what's actually on screen here.
function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <section ref={containerRef} className="hero3d-scroll" id="home">
      <div className="hero3d-sticky">
        <Hero3DScene containerRef={containerRef} />
      </div>
      <div className="sr-only">
        <span>Portfolio Analytics Terminal</span>
      </div>
      <HeroSEOContent visuallyHidden />
    </section>
  );
}

// Defaults to the safe, always-visible fallback (both during SSR and the
// very first client render) and only "upgrades" to the 3D scene once
// we've positively confirmed, on the client, that: it's not a mobile
// device (3D scroll-jacking + WebGL on varied mobile GPUs is exactly the
// kind of thing that's prone to poor framerate, and the brief explicitly
// sanctions using the static fallback there instead), the user hasn't
// asked for reduced motion, and WebGL actually works in this browser.
// This "capable until proven otherwise" order — rather than the reverse —
// is what guarantees nobody ever sees a blank page if 3D can't run.
function Hero() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    if (isMobile || prefersReducedMotion) {
      setUse3D(false);
      return;
    }
    setUse3D(detectWebGL());
  }, [isMobile, prefersReducedMotion]);

  return use3D ? <Hero3D /> : <HeroFallback />;
}

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

      {/* HERO — 3D scrollytelling scene when the browser/device can
          handle it, a fully static/visible fallback otherwise. */}
      <Hero />

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
