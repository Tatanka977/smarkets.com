import { createFileRoute, Link } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";
import { BLOG_POSTS } from "@/blogPosts";
import "../LandingPage.css";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Strategic Markets — Blog" },
      { name: "description", content: "News, market commentary, and updates from Strategic Markets." },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";

  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <span className="logo-accent">Strategic</span> <span className="logo-muted">Markets</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={toggleTheme}
              title={isAurora ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle light/dark mode"
              style={{
                background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: "50%", width: 34, height: 34, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {isAurora ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      <section className="hero" style={{ paddingTop: 60, paddingBottom: 40 }}>
        <div className="container">
          <span className="badge">FROM THE STRATEGIC MARKETS DESK</span>
          <h1 style={{ fontSize: 42, marginBottom: 12 }}>Blog</h1>
          <p style={{ maxWidth: 560 }}>
            Market commentary, product updates, and notes from building Strategic Markets.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: 100 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, opacity: 0.6 }}>
                    {new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {post.sourceName && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                      padding: "2px 8px", borderRadius: 999,
                      background: "rgba(59,130,246,0.1)", color: "#3b82f6",
                    }}>
                      via {post.sourceName}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{post.title}</h3>
                <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.5 }}>{post.excerpt}</p>
              </Link>
            ))}

            {BLOG_POSTS.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
                No posts yet — check back soon.
              </div>
            )}
          </div>
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
