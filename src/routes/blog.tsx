import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useUser } from "@/hooks/useUser";
import { listBlogPosts, createBlogPost, deleteBlogPost, type BlogPost } from "@/lib/blog.functions";
import "../LandingPage.css";

const OWNER_EMAIL = "domenico.valvona.dv@gmail.com";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Strategic Markets — Blog" },
      { name: "description", content: "News, market commentary, and updates from Strategic Markets." },
    ],
  }),
  component: BlogIndexPage,
});

function ThemeToggle() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  return (
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
  );
}

function NewPostForm({ onPosted }: { onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true); setError("");
    try {
      await createBlogPost({ title, content, sourceName: sourceName || undefined, sourceUrl: sourceUrl || undefined });
      setTitle(""); setContent(""); setSourceName(""); setSourceUrl(""); setOpen(false);
      onPosted();
    } catch (e: any) {
      setError(e.message || "Failed to publish.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        + New Post
      </button>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          style={{ padding: "10px 12px", fontSize: 18, fontWeight: 700, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8, background: "transparent", color: "inherit" }}
        />
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post... (separate paragraphs with a blank line)"
          rows={8}
          style={{ padding: "10px 12px", fontSize: 15, lineHeight: 1.6, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8, background: "transparent", color: "inherit", resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={sourceName} onChange={(e) => setSourceName(e.target.value)}
            placeholder="Source name (optional, e.g. Yahoo Finance)"
            style={{ flex: 1, minWidth: 200, padding: "8px 10px", fontSize: 13, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8, background: "transparent", color: "inherit" }}
          />
          <input
            value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Source URL (optional)"
            style={{ flex: 1, minWidth: 200, padding: "8px 10px", fontSize: 13, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8, background: "transparent", color: "inherit" }}
          />
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={saving || !title.trim() || !content.trim()} className="btn btn-primary">
            {saving ? "Publishing..." : "Publish"}
          </button>
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function BlogIndexPage() {
  const { user } = useUser();
  const isOwner = user?.email === OWNER_EMAIL;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listBlogPosts().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    try { await deleteBlogPost(id); load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="landing">
      <header className="header">
        <div className="container nav">
          <a href="/" className="logo" style={{ textDecoration: "none" }}>
            <span className="logo-accent">Strategic</span> <span className="logo-muted">Markets</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ThemeToggle />
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
            {isOwner && <NewPostForm onPosted={load} />}

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.6 }}>Loading...</div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
                No posts yet — check back soon.
              </div>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="card"
                  style={{ display: "block", textDecoration: "none", color: "inherit", position: "relative" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
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
                    {isOwner && (
                      <button
                        onClick={(e) => handleDelete(post.id, e)}
                        style={{
                          marginLeft: "auto", background: "none", border: "1px solid rgba(128,128,128,0.3)",
                          borderRadius: 6, cursor: "pointer", fontSize: 11, padding: "2px 8px", color: "inherit", opacity: 0.7,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{post.title}</h3>
                  <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.5 }}>{post.excerpt}</p>
                </Link>
              ))
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
