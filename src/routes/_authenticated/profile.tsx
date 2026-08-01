import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePersistentState } from "@/hooks/usePersistentState";
import { LogoIcon } from "@/components/Logo";
import { B, FKey } from "@/lib/uiShared";
import { INVESTOR_PROFILE_FIELDS } from "@/components/OnboardingQuestionnaire";
import { Avatar } from "@/components/CommunityPage";
import {
  listPortfolios, deletePortfolio,
  listWatchlist, deleteWatchlist, updateWatchlistAlert,
  listConversations, deleteConversation,
  updateProfile, getMyProfile, setUsername,
  getInvestorProfile, saveInvestorProfile,
} from "@/lib/profile.functions";
import type { MyProfile } from "@/lib/profile.functions";
import {
  listMyCommunityPosts, listMyCommunityComments,
  createCommunityPost, deleteCommunityPost, deleteCommunityComment,
  getCommunityPost,
} from "@/lib/community.functions";
import type { CommunityPost, CommunityCommentWithPost } from "@/lib/community.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Strategic Markets — My profile" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

const FONT = "'Courier New', Courier, monospace";

const cardStyle: any = {
  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12,
  padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
};
const labelStyle: any = { fontSize: 10, color: B.gray3, letterSpacing: "0.1em", fontFamily: FONT };
const inputStyle: any = {
  background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
  padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none",
};
const primaryBtnStyle = (enabled: boolean): any => ({
  background: enabled ? B.blue : B.panel2, color: enabled ? B.white : B.gray3,
  border: "none", padding: "7px 14px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 700,
  letterSpacing: "0.05em", cursor: enabled ? "pointer" : "not-allowed", whiteSpace: "nowrap",
});
const ghostBtnStyle = (color: string): any => ({
  background: "transparent", border: `1px solid ${color}`, color,
  padding: "5px 10px", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 700,
  letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap",
});

// profiles.created_at is stamped by the handle_new_user() signup trigger
// at the same instant the auth.users row is created, so it's an exact
// account-creation timestamp, not an approximation.
function fmtJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function fmtMemberFor(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Member for less than a day";
  if (days < 30) return `Member for ${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Member for ${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `Member for ${years} year${years === 1 ? "" : "s"}${remMonths ? `, ${remMonths} month${remMonths === 1 ? "" : "s"}` : ""}`;
}
function fmtAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

type Tab = "overview" | "posts" | "comments" | "portfolios" | "watchlist" | "ai" | "saved" | "investor";

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{value}</div>
      <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";
  const isMobile = useIsMobile();

  const fPorts = useServerFn(listPortfolios);
  const fDelP  = useServerFn(deletePortfolio);
  const fWatch = useServerFn(listWatchlist);
  const fDelW  = useServerFn(deleteWatchlist);
  const fAlertW = useServerFn(updateWatchlistAlert);
  const fConv  = useServerFn(listConversations);
  const fDelC  = useServerFn(deleteConversation);

  const [tab, setTab] = useState<Tab>("overview");
  const [ports, setPorts] = useState<any[]>([]);
  const [watch, setWatch] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [myComments, setMyComments] = useState<CommunityCommentWithPost[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);

  // "Saved" tab — Community's Save/bookmark button is a localStorage-only
  // list of post ids (no dedicated table exists yet, see PostActions in
  // CommunityPage.tsx); read the same key here and resolve each id to a
  // real post, rather than inventing a synced version of a feature that
  // doesn't exist server-side.
  const [savedIds] = usePersistentState<string[]>("community_saved_posts", []);
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // ── Edit Profile modal (display name + bio together) ────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Community username (kept in the Account card on Overview) ───────
  const [username, setUsernameField] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // ── Investor profile (kept, now its own tab) ─────────────────────────
  const [investor, setInvestor] = useState<Record<string, string>>({});
  const [savingInvestor, setSavingInvestor] = useState(false);
  const [investorSaved, setInvestorSaved] = useState(false);
  const [investorError, setInvestorError] = useState("");

  // ── u/username-style "new post" composer, straight from the profile ─
  // page — no topic picker: these always post to the Community Home feed
  // under no topic, same as the rest of this page's Reddit-profile spirit.
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const loadAll = async () => {
    // Fetched separately from the rest: if investor_profiles is missing or
    // errors out, it must not blank out portfolios/watchlist/AI chats/
    // profile too — a single Promise.all here previously failed all of
    // them together on any one rejection.
    try {
      const [p, w, c, mp] = await Promise.all([fPorts(), fWatch(), fConv(), getMyProfile()]);
      setPorts(p || []); setWatch(w || []); setConvs(c || []);
      setMyProfile(mp);
      setUsernameField(mp?.username || "");
    } catch (e) { console.warn(e); }
    try {
      const inv = await getInvestorProfile();
      setInvestor((inv as any) || {});
    } catch (e: any) {
      console.warn(e);
      setInvestorError(e.message || "Could not load your investor profile.");
    }
    // Separate again, same reasoning as investor_profile above: community
    // posts/comments failing to load must not blank out the rest of the page.
    try {
      const [mp2, mc] = await Promise.all([listMyCommunityPosts(), listMyCommunityComments()]);
      setMyPosts(mp2 || []); setMyComments(mc || []);
    } catch (e) { console.warn(e); }
  };

  // Community lives inside the SPA terminal (a different route), so opening
  // one of the user's own posts reuses the exact same pending-post handoff
  // NotificationBell already uses for "new comment" notifications: stash the
  // post id, point the terminal's persisted page at "community", navigate.
  const openCommunityPost = (postId: string) => {
    try {
      window.localStorage.setItem("moneta_community_pending_post", JSON.stringify(postId));
      window.localStorage.setItem("moneta_page_v1", "community");
    } catch {}
    navigate({ to: "/terminal" });
  };

  // Same cross-route handoff pattern, for opening a saved portfolio at its
  // exact holdings (PortfolioPage in PortfolioTerminal.tsx reads this key).
  const openPortfolio = (p: any) => {
    try {
      window.localStorage.setItem("moneta_portfolio_pending_load", JSON.stringify(p.holdings || []));
      window.localStorage.setItem("moneta_page_v1", "portfolio");
    } catch {}
    navigate({ to: "/terminal" });
  };

  const goToSearch = () => {
    try { window.localStorage.setItem("moneta_page_v1", "search"); } catch {}
    navigate({ to: "/terminal" });
  };

  const submitProfilePost = async () => {
    if (!postTitle.trim() || !postBody.trim() || posting) return;
    setPosting(true); setPostError("");
    try {
      await createCommunityPost({ data: { title: postTitle, body: postBody, channelId: null } });
      setPostTitle(""); setPostBody(""); setShowPostForm(false);
      const mp = await listMyCommunityPosts();
      setMyPosts(mp || []);
    } catch (e: any) {
      setPostError(e.message || "Error publishing post");
    } finally {
      setPosting(false);
    }
  };

  // AIAdvisorPage (on a different route entirely, /terminal) picks this up
  // via the same usePersistentState pending-handoff pattern already used
  // for "ai_pending_prompt" — there's no shared component tree to prop-drill
  // a setter through, so localStorage is the handoff mechanism.
  const loadConversation = (conv: any) => {
    try {
      window.localStorage.setItem("moneta_ai_pending_conversation", JSON.stringify(conv.messages || []));
      window.localStorage.setItem("moneta_page_v1", "ai");
    } catch {}
    navigate({ to: "/terminal" });
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (user) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (tab !== "saved" || !savedIds.length) { setSavedPosts([]); return; }
    let alive = true;
    setSavedLoading(true);
    Promise.all(savedIds.map((id) => getCommunityPost({ data: { id } }).catch(() => null)))
      .then((rows) => {
        if (!alive) return;
        const found = (rows.filter(Boolean) as CommunityPost[])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSavedPosts(found);
      })
      .finally(() => { if (alive) setSavedLoading(false); });
    return () => { alive = false; };
  }, [tab, savedIds]);

  const openEditModal = () => {
    setEditName(myProfile?.display_name || user?.name || "");
    setEditBio(myProfile?.bio || "");
    setProfileError("");
    setShowEditModal(true);
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true); setProfileError("");
    try {
      await updateProfile({ data: { display_name: editName.trim(), bio: editBio.trim() } });
      const fresh = await getMyProfile();
      setMyProfile(fresh);
      setShowEditModal(false);
    } catch (e: any) {
      setProfileError(e.message || "Error saving profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveUsername = async () => {
    if (!username.trim() || savingUsername) return;
    setSavingUsername(true); setUsernameError("");
    try {
      const { username: saved } = await setUsername({ data: { username } });
      setMyProfile((mp) => (mp ? { ...mp, username: saved } : mp));
      setUsernameField(saved);
    } catch (e: any) {
      setUsernameError(e.message || "Error saving username");
    } finally {
      setSavingUsername(false);
    }
  };

  const saveInvestor = async () => {
    if (savingInvestor) return;
    setSavingInvestor(true); setInvestorSaved(false); setInvestorError("");
    try {
      await saveInvestorProfile({ data: investor as any });
      setInvestorSaved(true);
    } catch (e: any) {
      setInvestorError(e.message || "Error saving investor profile");
    } finally {
      setSavingInvestor(false);
    }
  };

  // Real posts + comments merged into one reverse-chronological feed for
  // the Overview tab's "Recent Activity" — only ever built from myPosts/
  // myComments, never invented.
  const recentActivity = useMemo(() => {
    const postItems = myPosts.map((p) => ({
      kind: "post" as const, id: p.id, date: p.created_at, title: p.title,
      channelName: p.community_channels?.name || "No topic",
      score: p.score, commentCount: p.comment_count as number | null, postId: p.id as string | null,
    }));
    const commentItems = myComments.map((c) => ({
      kind: "comment" as const, id: c.id, date: c.created_at,
      title: c.community_posts?.title || "a deleted post",
      channelName: null as string | null,
      score: c.score, commentCount: null as number | null, postId: c.community_posts?.id ?? null,
    }));
    return [...postItems, ...commentItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [myPosts, myComments]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: B.bg, color: B.gray2, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 12 }}>
        LOADING…
      </div>
    );
  }

  const displayName = myProfile?.display_name || user.name || user.email;
  const handle = myProfile?.username || (user.email || "user").split("@")[0];
  const avatarName = myProfile?.username || myProfile?.display_name || user.name || user.email;
  const list = tab === "watchlist" ? watch : tab === "ai" ? convs : [];

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "posts", label: `POSTS (${myPosts.length})` },
    { id: "comments", label: `COMMENTS (${myComments.length})` },
    { id: "portfolios", label: `PORTFOLIOS (${ports.length})` },
    { id: "watchlist", label: `WATCHLIST (${watch.length})` },
    { id: "ai", label: `AI CHAT (${convs.length})` },
    { id: "saved", label: `SAVED (${savedIds.length})` },
    { id: "investor", label: "INVESTOR PROFILE" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: B.bg, color: B.gray1, fontFamily: FONT }}>
      <div className="sm-shell" style={{ minHeight: "100vh" }}>
        <div style={{ background: B.blue, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={26} />
            <div>
              <div style={{ fontSize: 16, color: B.white, fontWeight: 700, letterSpacing: "0.14em" }}>STRATEGIC MARKETS</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em" }}>USER PROFILE</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={toggleTheme}
              title={isAurora ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle light/dark mode"
              style={{
                background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "50%", width: 28, height: 28, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {isAurora ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Link to="/terminal" style={{ fontSize: 11, color: B.white, textDecoration: "none", fontWeight: 700, border: `1px solid ${B.white}`, borderRadius: 6, padding: "4px 10px", letterSpacing: "0.06em" }}>
              ← TERMINAL
            </Link>
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Profile header ─────────────────────────────────────────── */}
          <div style={{ ...cardStyle, gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                <Avatar name={avatarName} size={64} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, color: B.gray1, fontWeight: 700 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: B.blue, fontWeight: 700 }}>@{handle}</div>
                  <div style={{ fontSize: 11, color: B.gray3, marginTop: 4 }}>
                    {myProfile?.created_at ? `Joined ${fmtJoined(myProfile.created_at)} · ${fmtMemberFor(myProfile.created_at)}` : "…"}
                  </div>
                </div>
              </div>
              <button onClick={openEditModal} style={ghostBtnStyle(B.blue)}>EDIT PROFILE</button>
            </div>
            {myProfile?.bio ? (
              <div style={{ fontSize: 13, color: B.gray2, lineHeight: 1.5 }}>{myProfile.bio}</div>
            ) : (
              <button onClick={openEditModal} style={{
                alignSelf: "flex-start", background: "none", border: "none", color: B.gray3,
                fontFamily: FONT, fontSize: 12, fontStyle: "italic", cursor: "pointer", padding: 0,
              }}>+ Add a bio</button>
            )}
          </div>

          {/* ── Stats row — real counts only; no Followers/Following, see
                summary at the end of this task ─────────────────────────── */}
          <div style={{ display: "flex", gap: isMobile ? 20 : 32, flexWrap: "wrap" }}>
            <StatItem label="Posts" value={myPosts.length} />
            <StatItem label="Comments" value={myComments.length} />
            <StatItem label="Portfolios" value={ports.length} />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: `1px solid ${B.border}`, paddingBottom: 10 }}>
            {TABS.map((t) => (
              <FKey key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </div>

          {/* ── Overview ────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={labelStyle}>ABOUT ME</div>
                  <button onClick={openEditModal} style={{ background: "none", border: "none", color: B.blue, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>
                    {myProfile?.bio ? "EDIT BIO" : "ADD BIO"}
                  </button>
                </div>
                <div style={{ fontSize: 13, color: myProfile?.bio ? B.gray1 : B.gray3, lineHeight: 1.6 }}>
                  {myProfile?.bio || "Add a bio to tell the community who you are and what you invest in."}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={labelStyle}>RECENT ACTIVITY</div>
                  <button onClick={() => setTab("posts")} style={{ background: "none", border: "none", color: B.blue, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>
                    VIEW ALL →
                  </button>
                </div>
                {recentActivity.length === 0 ? (
                  <div style={{ fontSize: 12, color: B.gray3 }}>No activity yet — write a post or join a discussion in COMMUNITY.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recentActivity.map((a) => (
                      <div
                        key={`${a.kind}-${a.id}`}
                        onClick={() => a.postId && openCommunityPost(a.postId)}
                        style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: a.postId ? "pointer" : "default" }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                          background: a.kind === "post" ? B.blue : B.green,
                        }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, color: B.gray1 }}>
                            {a.kind === "post" ? "Posted " : "Commented on "}
                            <span style={{ color: B.blue, fontWeight: 700 }}>{a.title}</span>
                          </div>
                          <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                            {a.channelName ? `${a.channelName} · ` : ""}{fmtAgo(a.date)} · {a.score} pts{a.commentCount != null ? ` · ${a.commentCount} comments` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>ACCOUNT</div>
                <div>
                  <div style={{ fontSize: 11, color: B.gray3, marginBottom: 4 }}>
                    Community username — shown as the author on your posts and comments
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={username}
                      onChange={(e) => { setUsernameField(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUsernameError(""); }}
                      placeholder="e.g. john_doe" maxLength={20}
                      style={{ ...inputStyle, flex: "1 1 200px" }}
                    />
                    <button
                      disabled={!username.trim() || savingUsername || username === myProfile?.username}
                      onClick={saveUsername}
                      style={primaryBtnStyle(!!username.trim() && !savingUsername && username !== myProfile?.username)}
                    >
                      {savingUsername ? "SAVING..." : "SAVE"}
                    </button>
                  </div>
                  {usernameError && <div style={{ fontSize: 11, color: B.red, marginTop: 4 }}>{usernameError}</div>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: B.gray3 }}>
                    Signed in via <span style={{ color: B.green, fontWeight: 700, textTransform: "uppercase" }}>{user.provider}</span>
                  </div>
                  <button onClick={async () => { await logout(); navigate({ to: "/auth" }); }} style={ghostBtnStyle(B.red)}>SIGN OUT</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Posts ───────────────────────────────────────────────────── */}
          {tab === "posts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {!showPostForm ? (
                <button onClick={() => setShowPostForm(true)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10,
                  padding: "10px 14px", cursor: "pointer", color: B.gray3, fontSize: 13, fontFamily: FONT,
                }}>Create a post — goes straight to the Community Home feed, under no topic</button>
              ) : (
                <div style={{ ...cardStyle }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={labelStyle}>NEW POST · NO TOPIC</div>
                    <button onClick={() => setShowPostForm(false)} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>CANCEL</button>
                  </div>
                  <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title" maxLength={200} style={inputStyle} />
                  <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="Write something..." rows={4} maxLength={8000} style={{ ...inputStyle, resize: "vertical" }} />
                  {postError && <div style={{ fontSize: 11, color: B.red }}>{postError}</div>}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button disabled={!postTitle.trim() || !postBody.trim() || posting} onClick={submitProfilePost} style={primaryBtnStyle(!!postTitle.trim() && !!postBody.trim() && !posting)}>
                      {posting ? "PUBLISHING..." : "PUBLISH"}
                    </button>
                  </div>
                </div>
              )}

              {myPosts.map((p) => (
                <div key={p.id} onClick={() => openCommunityPost(p.id)} style={{
                  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: B.blue, fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                        {p.community_channels?.name || "No topic"} · {p.score} points · {p.comment_count} comments · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Delete this post?")) return;
                      await deleteCommunityPost({ data: { id: p.id } });
                      loadAll();
                    }} style={{ ...ghostBtnStyle(B.red), flexShrink: 0 }}>DELETE</button>
                  </div>
                </div>
              ))}
              {myPosts.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>No posts yet</div>
              )}
            </div>
          )}

          {/* ── Comments ────────────────────────────────────────────────── */}
          {tab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myComments.map((c) => (
                <div key={c.id} onClick={() => c.community_posts && openCommunityPost(c.community_posts.id)} style={{
                  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px",
                  cursor: c.community_posts ? "pointer" : "default",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: B.gray3 }}>
                        on <span style={{ color: B.blue, fontWeight: 700 }}>{c.community_posts?.title || "a deleted post"}</span>
                      </div>
                      <div style={{ fontSize: 13, color: B.gray1, marginTop: 4 }}>{c.body}</div>
                      <div style={{ fontSize: 11, color: B.gray3, marginTop: 4 }}>
                        {c.score} points · {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Delete this comment?")) return;
                      await deleteCommunityComment({ data: { id: c.id } });
                      loadAll();
                    }} style={{ ...ghostBtnStyle(B.red), flexShrink: 0 }}>DELETE</button>
                  </div>
                </div>
              ))}
              {myComments.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>No comments yet</div>
              )}
            </div>
          )}

          {/* ── Portfolios ──────────────────────────────────────────────── */}
          {tab === "portfolios" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ports.length === 0 ? (
                <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 40 }}>💼</div>
                  <div style={{ fontSize: 13, color: B.gray2, fontWeight: 700 }}>No portfolios yet</div>
                  <div style={{ fontSize: 12, color: B.gray3, maxWidth: 280, lineHeight: 1.5 }}>
                    Save a portfolio from the terminal to see it here.
                  </div>
                  <button onClick={goToSearch} style={{ ...primaryBtnStyle(true), marginTop: 4 }}>CREATE PORTFOLIO</button>
                </div>
              ) : (
                ports.map((it: any) => (
                  <div key={it.id} style={{
                    background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: B.blue, fontWeight: 700 }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                        {(it.holdings || []).length} positions · {new Date(it.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openPortfolio(it)} style={ghostBtnStyle(B.blue)}>OPEN</button>
                      <button onClick={async () => { await fDelP({ data: { id: it.id } }); loadAll(); }} style={ghostBtnStyle(B.red)}>DELETE</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Watchlist / AI Chat (shared generic list) ─────────────────── */}
          {(tab === "watchlist" || tab === "ai") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((it: any) => (
                <div key={it.id} style={{
                  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: B.blue, fontWeight: 700 }}>{it.name || it.symbol || it.title}</div>
                    <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                      {tab === "watchlist" && `${it.category || ""} · ${new Date(it.created_at).toLocaleDateString()}${it.target_price != null ? ` · ALERT ${it.direction} ${it.target_price}` : ""}`}
                      {tab === "ai" && `${(it.messages || []).length} messages · ${new Date(it.updated_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {tab === "watchlist" && (
                      <button onClick={async () => {
                        const input = window.prompt(
                          `Alert price for ${it.symbol} (leave blank to clear):`,
                          it.target_price != null ? String(it.target_price) : ""
                        );
                        if (input === null) return;
                        const price = input.trim() === "" ? null : parseFloat(input);
                        if (price != null && (!isFinite(price) || price <= 0)) return;
                        let direction: "above" | "below" | null = it.direction || "above";
                        if (price != null) {
                          const dirInput = window.prompt(`Notify when ${it.symbol} goes "above" or "below" ${price}?`, direction);
                          if (dirInput !== "above" && dirInput !== "below") return;
                          direction = dirInput;
                        } else {
                          direction = null;
                        }
                        if (price != null && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                          try { await Notification.requestPermission(); } catch {}
                        }
                        await fAlertW({ data: { id: it.id, target_price: price, direction } });
                        loadAll();
                      }} style={ghostBtnStyle(B.yellow)}>ALERT</button>
                    )}
                    {tab === "ai" && (
                      <button onClick={() => loadConversation(it)} style={ghostBtnStyle(B.blue)}>LOAD</button>
                    )}
                    <button onClick={async () => {
                      if (tab === "watchlist") await fDelW({ data: { id: it.id } });
                      if (tab === "ai") await fDelC({ data: { id: it.id } });
                      loadAll();
                    }} style={ghostBtnStyle(B.red)}>DELETE</button>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>
                  {tab === "watchlist" && "No tickers in your watchlist"}
                  {tab === "ai" && "No saved conversations"}
                </div>
              )}
            </div>
          )}

          {/* ── Saved ───────────────────────────────────────────────────── */}
          {tab === "saved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {savedLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>LOADING…</div>
              ) : savedPosts.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>No saved items yet</div>
              ) : (
                savedPosts.map((p) => (
                  <div key={p.id} onClick={() => openCommunityPost(p.id)} style={{
                    background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 13, color: B.blue, fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                      {p.community_channels?.name || "No topic"} · u/{p.author_name} · {p.score} points · {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Investor Profile ────────────────────────────────────────── */}
          {tab === "investor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: B.gray3, lineHeight: 1.5 }}>
                Self-reported context the AI advisor uses to tailor scenario relevance — never as a basis for personalized advice. Change any answer at any time.
              </div>
              {investorError && (
                <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, fontFamily: FONT }}>
                  {investorError}
                </div>
              )}
              <div style={{ ...cardStyle, gap: 12 }}>
                {INVESTOR_PROFILE_FIELDS.filter((f) => !f.showIf || f.showIf(investor)).map((f) => (
                  <div key={f.key}>
                    <div style={{ ...labelStyle, marginBottom: 4 }}>{f.label}</div>
                    <select
                      value={investor[f.key] || ""}
                      onChange={(e) => { setInvestor((v) => ({ ...v, [f.key]: e.target.value })); setInvestorSaved(false); }}
                      style={{ ...inputStyle, width: "100%" }}
                    >
                      <option value="">Not set</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button disabled={savingInvestor} onClick={saveInvestor} style={primaryBtnStyle(!savingInvestor)}>
                    {savingInvestor ? "SAVING..." : "SAVE"}
                  </button>
                  {investorSaved && <div style={{ fontSize: 11, color: B.green }}>Saved.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Profile modal ───────────────────────────────────────────── */}
      {showEditModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowEditModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            ...cardStyle, width: "100%", maxWidth: 420, gap: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: B.gray1 }}>EDIT PROFILE</div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 4 }}>DISPLAY NAME</div>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 4 }}>BIO</div>
              <textarea
                value={editBio} onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell the community who you are and what you invest in..."
                rows={4} maxLength={300} style={{ ...inputStyle, width: "100%", resize: "vertical" }}
              />
            </div>
            {profileError && <div style={{ fontSize: 11, color: B.red }}>{profileError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>CANCEL</button>
              <button disabled={savingProfile} onClick={saveProfile} style={primaryBtnStyle(!savingProfile)}>
                {savingProfile ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
