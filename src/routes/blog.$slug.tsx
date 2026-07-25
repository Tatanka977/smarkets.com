import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { getBlogPostBySlug } from "@/lib/blog.functions";
import "../LandingPage.css";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPostBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Strategic Markets — ${loaderData?.title ?? "Blog"}` },
      { name: "description", content: loaderData?.excerpt ?? "" },
    ],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";

  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <LogoWithText />
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

      <section className="hero" style={{ paddingTop: 60, paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <Link to="/blog" style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}>
            ← Back to blog
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, opacity: 0.6 }}>
              {new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </span>
            {post.source_name && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                padding: "2px 8px", borderRadius: 999,
                background: "rgba(59,130,246,0.1)", color: "#3b82f6",
              }}>
                via {post.source_name}
              </span>
            )}
          </div>

          <h1 style={{ marginTop: 0, marginBottom: 28 }}>{post.title}</h1>

          <div style={{ fontSize: 17, lineHeight: 1.75 }}>
            {post.content.split("\n\n").map((para, i) => (
              <p key={i} style={{ marginBottom: 20 }}>{para}</p>
            ))}
          </div>

          {post.source_url && (
            <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid rgba(128,128,128,0.2)" }}>
              <a href={post.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#3b82f6", textDecoration: "none" }}>
                Original source: {post.source_name || "link"} →
              </a>
            </div>
          )}
        </div>
      </section>

      <footer>
        <div className="container footer-grid">
          <div className="logo footer-logo">
            <LogoWithText iconSize={22} textSize={16} />
          </div>
          <div className="footer-copy">© 2026 Strategic Markets. All rights reserved.</div>
          <div className="footer-links">
            <a href="/disclaimer">Privacy</a>
            <a href="/disclaimer">Terms</a>
            <a href="mailto:strat.markets@gmail.com">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
