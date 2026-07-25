import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/hooks/useTheme";
import { LogoIcon } from "@/components/Logo";
import { B, FKey } from "@/lib/uiShared";
import { INVESTOR_PROFILE_FIELDS } from "@/components/OnboardingQuestionnaire";
import {
  listPortfolios, deletePortfolio,
  listWatchlist, deleteWatchlist, updateWatchlistAlert,
  listConversations, deleteConversation,
  updateProfile, getMyUsername, setUsername,
  getInvestorProfile, saveInvestorProfile,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Strategic Markets — My profile" }] }),
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

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";

  const fPorts = useServerFn(listPortfolios);
  const fDelP  = useServerFn(deletePortfolio);
  const fWatch = useServerFn(listWatchlist);
  const fDelW  = useServerFn(deleteWatchlist);
  const fAlertW = useServerFn(updateWatchlistAlert);
  const fConv  = useServerFn(listConversations);
  const fDelC  = useServerFn(deleteConversation);

  const [tab, setTab] = useState<"profile" | "investor" | "portfolios" | "watchlist" | "ai">("profile");
  const [ports, setPorts] = useState<any[]>([]);
  const [watch, setWatch] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);

  // ── Editable identity fields ────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [username, setUsernameField] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null | undefined>(undefined);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [investor, setInvestor] = useState<Record<string, string>>({});
  const [savingInvestor, setSavingInvestor] = useState(false);
  const [investorSaved, setInvestorSaved] = useState(false);

  const loadAll = async () => {
    try {
      const [p, w, c, u, inv] = await Promise.all([
        fPorts(), fWatch(), fConv(), getMyUsername(), getInvestorProfile(),
      ]);
      setPorts(p || []); setWatch(w || []); setConvs(c || []);
      setSavedUsername(u); setUsernameField(u || "");
      setInvestor((inv as any) || {});
    } catch (e) { console.warn(e); }
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
    if (user) { setDisplayName(user.name || ""); loadAll(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const saveDisplayName = async () => {
    if (!displayName.trim() || savingName) return;
    setSavingName(true); setNameSaved(false);
    try {
      await updateProfile({ data: { display_name: displayName.trim() } });
      setNameSaved(true);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setSavingName(false);
    }
  };

  const saveUsername = async () => {
    if (!username.trim() || savingUsername) return;
    setSavingUsername(true); setUsernameError("");
    try {
      const { username: saved } = await setUsername({ data: { username } });
      setSavedUsername(saved); setUsernameField(saved);
    } catch (e: any) {
      setUsernameError(e.message || "Error saving username");
    } finally {
      setSavingUsername(false);
    }
  };

  const saveInvestor = async () => {
    if (savingInvestor) return;
    setSavingInvestor(true); setInvestorSaved(false);
    try {
      await saveInvestorProfile({ data: investor as any });
      setInvestorSaved(true);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setSavingInvestor(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: B.bg, color: B.gray2, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 12 }}>
        LOADING…
      </div>
    );
  }

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  const list = tab === "portfolios" ? ports : tab === "watchlist" ? watch : tab === "ai" ? convs : [];

  return (
    <div style={{ minHeight: "100vh", background: B.bg, color: B.gray1, fontFamily: FONT }}>
      <div style={{ maxWidth: 820, margin: "0 auto", borderLeft: `1px solid ${B.border}`, borderRight: `1px solid ${B.border}`, minHeight: "100vh" }}>
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

        <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: `1px solid ${B.border}`, background: B.panel2, overflowX: "auto" }}>
          {[
            { id: "profile", l: "PROFILE" },
            { id: "investor", l: "INVESTOR PROFILE" },
            { id: "portfolios", l: `PORTFOLIOS (${ports.length})` },
            { id: "watchlist", l: `WATCHLIST (${watch.length})` },
            { id: "ai", l: `AI CHAT (${convs.length})` },
          ].map((t: any) => (
            <FKey key={t.id} label={t.l} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>

        <div style={{ padding: 16 }}>
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {user.picture ? (
                  <img src={user.picture} alt="" style={{ width: 64, height: 64, borderRadius: "50%", border: `1px solid ${B.border}` }} />
                ) : (
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%", background: B.blue, color: B.white,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700,
                  }}>{initial}</div>
                )}
                <div>
                  <div style={{ fontSize: 17, color: B.gray1, fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: B.gray3 }}>{user.email}</div>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>DISPLAY NAME</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setNameSaved(false); }}
                    maxLength={80}
                    style={{ ...inputStyle, flex: "1 1 200px" }}
                  />
                  <button disabled={!displayName.trim() || savingName} onClick={saveDisplayName} style={primaryBtnStyle(!!displayName.trim() && !savingName)}>
                    {savingName ? "SAVING..." : "SAVE"}
                  </button>
                </div>
                {nameSaved && <div style={{ fontSize: 11, color: B.green }}>Saved.</div>}
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>COMMUNITY USERNAME</div>
                <div style={{ fontSize: 11, color: B.gray3, lineHeight: 1.5 }}>
                  Shown as the author on your posts and comments in COMMUNITY. 3-20 characters: lowercase letters, numbers, underscore.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={username}
                    onChange={(e) => { setUsernameField(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUsernameError(""); }}
                    placeholder="e.g. john_doe" maxLength={20}
                    style={{ ...inputStyle, flex: "1 1 200px" }}
                  />
                  <button disabled={!username.trim() || savingUsername || username === savedUsername} onClick={saveUsername} style={primaryBtnStyle(!!username.trim() && !savingUsername && username !== savedUsername)}>
                    {savingUsername ? "SAVING..." : "SAVE"}
                  </button>
                </div>
                {usernameError && <div style={{ fontSize: 11, color: B.red }}>{usernameError}</div>}
                {savedUsername && !usernameError && username === savedUsername && (
                  <div style={{ fontSize: 11, color: B.green }}>Current: u/{savedUsername}</div>
                )}
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>SIGN-IN METHOD</div>
                <div style={{ fontSize: 12, color: B.green, textTransform: "uppercase", fontWeight: 700 }}>{user.provider}</div>
              </div>

              <button data-testid="logout-btn" onClick={async () => { await logout(); navigate({ to: "/auth" }); }} style={{
                marginTop: 4, background: "transparent", border: `1px solid ${B.red}`, color: B.red, borderRadius: 6,
                padding: "10px 14px", fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer",
              }}>SIGN OUT</button>
            </div>
          )}

          {tab === "investor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: B.gray3, lineHeight: 1.5 }}>
                Self-reported context the AI advisor uses to tailor scenario relevance — never as a basis for personalized advice. Change any answer at any time.
              </div>
              <div style={{ ...cardStyle, gap: 12 }}>
                {INVESTOR_PROFILE_FIELDS.map((f) => (
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

          {tab !== "profile" && tab !== "investor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((it: any) => (
                <div key={it.id} style={{
                  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: B.blue, fontWeight: 700 }}>{it.name || it.symbol || it.title}</div>
                    <div style={{ fontSize: 11, color: B.gray3, marginTop: 2 }}>
                      {tab === "portfolios" && `${(it.holdings || []).length} positions · ${new Date(it.updated_at).toLocaleDateString()}`}
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
                      if (tab === "portfolios") await fDelP({ data: { id: it.id } });
                      if (tab === "watchlist") await fDelW({ data: { id: it.id } });
                      if (tab === "ai") await fDelC({ data: { id: it.id } });
                      loadAll();
                    }} style={ghostBtnStyle(B.red)}>DELETE</button>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: B.gray3, fontSize: 12 }}>
                  {tab === "portfolios" && "No portfolios saved yet"}
                  {tab === "watchlist" && "No tickers in your watchlist"}
                  {tab === "ai" && "No saved conversations"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
