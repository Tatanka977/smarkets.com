import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LogoWithText } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { getBlogPostBySlug } from "@/lib/blog.functions";
import "../LandingPage.css";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPostBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `Strategic Markets — ${loaderData?.title ?? "Blog"}` },
      { name: "description", content: loaderData?.excerpt ?? "" },
    ],
    links: [{ rel: "canonical", href: `https://s-markets.com/blog/${params.slug}` }],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  useTheme(); // dark-only now, no toggle — this just ensures data-theme="terminal" is set

  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <LogoWithText />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a className="btn btn-primary" href="/terminal">
              Open Terminal <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </header>

      {/* Fixed dark treatment, independent of the Aurora/Terminal toggle —
          same reasoning as .home-landing's hero: a cover image + bold
          white headline needs to read the same regardless of the site's
          light/dark setting, not go near-black-on-light in Aurora. Only
          this section is scoped dark; header/footer keep following the
          toggle as normal. Sub-elements below with no color of their own
          (date, article paragraphs, "Back to blog") inherit this section's
          light color automatically — only the ones with their own explicit
          color (h1, the source badge/link) needed a direct override. */}
      <section className="hero" style={{
        paddingTop: 60, paddingBottom: 80,
        background: "linear-gradient(160deg, #0a1128 0%, #000 100%)",
        color: "#E2E8F0",
      }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <Link to="/blog" style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}>
            ← Back to blog
          </Link>

          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              style={{
                display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover",
                borderRadius: "var(--land-radius)", marginTop: 24,
              }}
            />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, opacity: 0.6 }}>
              {new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </span>
            {post.source_name && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                padding: "2px 8px", borderRadius: 999,
                background: "rgba(59,130,246,0.15)", color: "#5B9BFF",
              }}>
                via {post.source_name}
              </span>
            )}
          </div>

          <h1 style={{ marginTop: 0, marginBottom: 28, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>
            {post.title}
          </h1>

          <div style={{ fontSize: 17, lineHeight: 1.75 }}>
            {post.content.split("\n\n").map((para, i) => (
              <p key={i} style={{ marginBottom: 20 }}>{para}</p>
            ))}
          </div>

          {post.source_url && (
            <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <a href={post.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#5B9BFF", textDecoration: "none" }}>
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
