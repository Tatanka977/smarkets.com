import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { B, FKey } from "@/lib/uiShared";
import { useUser } from "@/hooks/useUser";
import {
  listCommunityPosts, getCommunityPost, createCommunityPost, deleteCommunityPost,
  listCommunityComments, createCommunityComment, deleteCommunityComment,
  listMyVotes, setVote, removeVote,
} from "@/lib/community.functions";
import type { CommunityPost, CommunityComment } from "@/lib/community.functions";

const FONT = "'Courier New', Courier, monospace";

const backBtnStyle: any = {
  background: "none", border: "none", color: B.blue, cursor: "pointer",
  fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: 0, letterSpacing: "0.04em",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function VoteControl({ score, myVote, disabled, onVote }: {
  score: number; myVote: number; disabled: boolean; onVote: (v: 1 | -1) => void;
}) {
  const vote = (e: any, v: 1 | -1) => {
    e.stopPropagation();
    if (!disabled) onVote(v);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 34, flexShrink: 0 }}>
      <button disabled={disabled} onClick={(e) => vote(e, 1)} title={disabled ? "Accedi per votare" : "Upvote"} style={{
        background: "none", border: "none", cursor: disabled ? "default" : "pointer",
        color: myVote === 1 ? B.green : B.gray3, padding: 2, opacity: disabled ? 0.4 : 1,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: score > 0 ? B.green : score < 0 ? B.red : B.gray2 }}>{score}</span>
      <button disabled={disabled} onClick={(e) => vote(e, -1)} title={disabled ? "Accedi per votare" : "Downvote"} style={{
        background: "none", border: "none", cursor: disabled ? "default" : "pointer",
        color: myVote === -1 ? B.red : B.gray3, padding: 2, opacity: disabled ? 0.4 : 1,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
    </div>
  );
}

function PostList({ user, onOpen }: { user: any; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await listCommunityPosts({ data: { sort } });
      setPosts(rows);
      if (user) {
        const votes = await listMyVotes({ data: { postIds: rows.map((r) => r.id) } });
        setMyVotes(votes);
      } else {
        setMyVotes({});
      }
    } catch (e: any) {
      setError(e.message || "Errore nel caricamento delle discussioni");
    } finally {
      setLoading(false);
    }
  }, [sort, user]);

  useEffect(() => { load(); }, [load]);

  const submitPost = async () => {
    if (!user || posting || !title.trim() || !body.trim()) return;
    setPosting(true); setError("");
    try {
      await createCommunityPost({ data: { title, body } });
      setTitle(""); setBody(""); setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.message || "Errore nella pubblicazione");
    } finally {
      setPosting(false);
    }
  };

  const vote = async (postId: string, value: 1 | -1) => {
    if (!user) return;
    const current = myVotes[postId] || 0;
    const delta = current === value ? -value : value - current;
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, score: p.score + delta } : p)));
    setMyVotes((v) => ({ ...v, [postId]: current === value ? 0 : value }));
    try {
      if (current === value) await removeVote({ data: { postId } });
      else await setVote({ data: { postId, value } });
    } catch {
      load();
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 10, fontFamily: FONT }}>
        COMMUNITY — DISCUSSIONI
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <FKey label="RECENTI" active={sort === "recent"} onClick={() => setSort("recent")} />
          <FKey label="PIÙ VOTATI" active={sort === "top"} onClick={() => setSort("top")} />
        </div>
        {user ? (
          <button onClick={() => setShowForm((s) => !s)} style={{
            background: B.blue, border: "none", color: B.white, padding: "8px 14px", borderRadius: 6,
            fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer",
          }}>{showForm ? "ANNULLA" : "+ NUOVA DISCUSSIONE"}</button>
        ) : (
          <Link to="/auth" style={{ fontSize: 12, color: B.blue, fontFamily: FONT, fontWeight: 700, textDecoration: "none" }}>
            ACCEDI PER PARTECIPARE →
          </Link>
        )}
      </div>

      {showForm && user && (
        <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" maxLength={200} style={{
            background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
            padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none",
          }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Scrivi qualcosa..." rows={4} maxLength={8000} style={{
            background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
            padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none", resize: "vertical",
          }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!title.trim() || !body.trim() || posting} onClick={submitPost} style={{
              background: (title.trim() && body.trim() && !posting) ? B.blue : B.panel2,
              color: (title.trim() && body.trim() && !posting) ? B.white : B.gray3,
              border: "none", padding: "8px 16px", borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700,
              cursor: (title.trim() && body.trim() && !posting) ? "pointer" : "not-allowed",
            }}>{posting ? "PUBBLICAZIONE..." : "PUBBLICA"}</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, marginBottom: 10, fontFamily: FONT }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>CARICAMENTO...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          Nessuna discussione ancora, sii il primo a scrivere.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p) => (
            <div key={p.id} onClick={() => onOpen(p.id)} style={{
              background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "12px 14px",
              display: "flex", gap: 12, cursor: "pointer",
            }}>
              <VoteControl score={p.score} myVote={myVotes[p.id] || 0} disabled={!user} onVote={(v) => vote(p.id, v)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 4 }}>{p.title}</div>
                <div style={{
                  fontSize: 12, color: B.gray2, fontFamily: FONT, marginBottom: 6,
                  overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                }}>{p.body}</div>
                <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>{p.author_name}</span>
                  <span>{fmtDate(p.created_at)}</span>
                  <span>{p.comment_count} commenti</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetail({ postId, user, onBack }: { postId: string; user: any; onBack: () => void }) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [myVote, setMyVote] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [p, cs] = await Promise.all([
        getCommunityPost({ data: { id: postId } }),
        listCommunityComments({ data: { postId } }),
      ]);
      setPost(p);
      setComments(cs);
      if (user && p) {
        const votes = await listMyVotes({ data: { postIds: [p.id] } });
        setMyVote(votes[p.id] || 0);
      } else {
        setMyVote(0);
      }
    } catch (e: any) {
      setError(e.message || "Errore nel caricamento della discussione");
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);

  const vote = async (value: 1 | -1) => {
    if (!user || !post) return;
    const current = myVote;
    const delta = current === value ? -value : value - current;
    setPost((p) => (p ? { ...p, score: p.score + delta } : p));
    setMyVote(current === value ? 0 : value);
    try {
      if (current === value) await removeVote({ data: { postId: post.id } });
      else await setVote({ data: { postId: post.id, value } });
    } catch {
      load();
    }
  };

  const submitComment = async () => {
    if (!user || !post || posting || !commentBody.trim()) return;
    setPosting(true); setError("");
    try {
      await createCommunityComment({ data: { postId: post.id, body: commentBody } });
      setCommentBody("");
      const cs = await listCommunityComments({ data: { postId: post.id } });
      setComments(cs);
      setPost((p) => (p ? { ...p, comment_count: p.comment_count + 1 } : p));
    } catch (e: any) {
      setError(e.message || "Errore nell'invio del commento");
    } finally {
      setPosting(false);
    }
  };

  const removePost = async () => {
    if (!post || !user || user.user_id !== post.user_id) return;
    if (!window.confirm("Eliminare questa discussione?")) return;
    try {
      await deleteCommunityPost({ data: { id: post.id } });
      onBack();
    } catch (e: any) {
      setError(e.message || "Errore nell'eliminazione");
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm("Eliminare questo commento?")) return;
    try {
      await deleteCommunityComment({ data: { id } });
      setComments((cs) => cs.filter((c) => c.id !== id));
      setPost((p) => (p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
    } catch (e: any) {
      setError(e.message || "Errore nell'eliminazione");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>CARICAMENTO...</div>;
  }
  if (!post) {
    return (
      <div>
        <button onClick={onBack} style={backBtnStyle}>← INDIETRO</button>
        <div style={{ padding: 20, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>Discussione non trovata.</div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}>← INDIETRO</button>
      {error && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, margin: "10px 0", fontFamily: FONT }}>
          {error}
        </div>
      )}
      <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, marginTop: 10 }}>
        <VoteControl score={post.score} myVote={myVote} disabled={!user} onVote={vote} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 6 }}>{post.title}</div>
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span>{post.author_name}</span>
            <span>{fmtDate(post.created_at)}</span>
            {user && user.user_id === post.user_id && (
              <button onClick={removePost} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: 0 }}>
                ELIMINA
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{post.body}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 8, fontFamily: FONT }}>
          {comments.length} COMMENTI
        </div>

        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Scrivi un commento..." rows={3} maxLength={3000} style={{
              background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
              padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none", resize: "vertical",
            }} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button disabled={!commentBody.trim() || posting} onClick={submitComment} style={{
                background: (commentBody.trim() && !posting) ? B.blue : B.panel2,
                color: (commentBody.trim() && !posting) ? B.white : B.gray3,
                border: "none", padding: "7px 14px", borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700,
                cursor: (commentBody.trim() && !posting) ? "pointer" : "not-allowed",
              }}>{posting ? "INVIO..." : "COMMENTA"}</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginBottom: 14 }}>
            <Link to="/auth" style={{ color: B.blue, fontWeight: 700, textDecoration: "none" }}>Accedi</Link> per lasciare un commento.
          </div>
        )}

        {comments.length === 0 ? (
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, padding: "10px 0" }}>Nessun commento ancora.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: B.gray2, fontWeight: 700 }}>{c.author_name}</span>
                  <span>{fmtDate(c.created_at)}</span>
                  {user && user.user_id === c.user_id && (
                    <button onClick={() => removeComment(c.id)} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: 0, marginLeft: "auto" }}>
                      ELIMINA
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, whiteSpace: "pre-wrap" }}>{c.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { user } = useUser();
  const [view, setView] = useState<{ mode: "list" } | { mode: "detail"; id: string }>({ mode: "list" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, padding: 12 }}>
        {view.mode === "list"
          ? <PostList user={user} onOpen={(id) => setView({ mode: "detail", id })} />
          : <PostDetail postId={view.id} user={user} onBack={() => setView({ mode: "list" })} />}
      </div>
    </div>
  );
}
