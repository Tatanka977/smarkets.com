// The real page content, in real semantic HTML — a genuine <h1>, a real
// paragraph, a real feature list, real <a href> links. When the 3D scene
// is active this is rendered with the .sr-only class (visually hidden,
// still fully present in the DOM and the accessibility tree — NOT
// display:none, which crawlers and screen readers alike can end up
// skipping). When a fallback is showing instead, this same content is
// rendered normally (see HeroFallback in LandingPage.tsx), so the text
// itself only ever lives in one place.
export default function HeroSEOContent({ visuallyHidden }: { visuallyHidden: boolean }) {
  return (
    <div className={visuallyHidden ? "sr-only" : undefined}>
      {/* When visible (fallback mode), the caller already renders its own
          "eyebrow" badge above this component — see HeroFallback in
          LandingPage.tsx — so this copy doesn't repeat it. */}
      <h1>Track markets. Test strategy. Learn what drives risk.</h1>
      <p>
        Strategic Markets is an educational portfolio terminal — live quotes
        across stocks, ETFs, bonds, crypto and FX, real risk analytics, and an
        AI assistant for scenario analysis. Built to help you understand
        markets, not to give financial advice.
      </p>
      <h2>What&apos;s inside</h2>
      <ul>
        <li>
          <strong>Analytics — Risk, not just returns.</strong> Sharpe, Sortino,
          drawdown, sector/geo concentration, and single-name risk with ETF
          look-through — see what&apos;s actually driving your risk.
        </li>
        <li>
          <strong>Coverage — Stocks, ETFs, bonds, crypto &amp; FX.</strong>{" "}
          Search and track multi-asset positions with live quotes and
          multi-currency valuation.
        </li>
        <li>
          <strong>AI assistant — Ask questions, get educational context.</strong>{" "}
          A portfolio-aware assistant that explains what the numbers mean —
          framed as education, never as personalized advice.
        </li>
      </ul>
      <p>
        <a href="/terminal">Open Terminal</a> · <a href="/blog">Read the blog</a>
      </p>
    </div>
  );
}
