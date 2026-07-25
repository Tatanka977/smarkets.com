import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { B, FKey, PIE_COLS, pMet, pCol, computeAlerts, groupBy, SEV_STYLE } from "@/lib/uiShared";
import { useUser } from "@/hooks/useUser";
import { usePersistentState } from "@/hooks/usePersistentState";
import { getMyUsername, setUsername as srvSetUsername, listPortfolios } from "@/lib/profile.functions";
import { OWNER_EMAIL } from "@/lib/admin";
import {
  listChannels, createChannel, deleteCommunityChannel,
  listAllCommunityPosts, listCommunityPosts, getCommunityPost, createCommunityPost, deleteCommunityPost,
  listCommunityComments, createCommunityComment, deleteCommunityComment,
  listMyVotes, setVote, removeVote,
  listMyCommentVotes, setCommentVote, removeCommentVote,
} from "@/lib/community.functions";
import type { CommunityChannel, CommunityPost, CommunityComment, PortfolioSnapshot, PortfolioSnapshotHolding } from "@/lib/community.functions";

const FONT = "'Courier New', Courier, monospace";

const backBtnStyle: any = {
  background: "none", border: "none", color: B.blue, cursor: "pointer",
  fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: 0, letterSpacing: "0.04em",
};

const primaryBtnStyle = (enabled: boolean): any => ({
  background: enabled ? B.blue : B.panel2,
  color: enabled ? B.white : B.gray3,
  border: "none", padding: "8px 16px", borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700,
  cursor: enabled ? "pointer" : "not-allowed",
});

const inputStyle: any = {
  background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
  padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none",
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
      <button disabled={disabled} onClick={(e) => vote(e, 1)} title={disabled ? "Sign in to vote" : "Upvote"} style={{
        background: "none", border: "none", cursor: disabled ? "default" : "pointer",
        color: myVote === 1 ? B.green : B.gray3, padding: 2, opacity: disabled ? 0.4 : 1,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: score > 0 ? B.green : score < 0 ? B.red : B.gray2 }}>{score}</span>
      <button disabled={disabled} onClick={(e) => vote(e, -1)} title={disabled ? "Sign in to vote" : "Downvote"} style={{
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

function BarChartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// Builds a shareable snapshot from a live/loaded holdings array (same
// {value, asset:{ticker,shortName,category,sector,dayChangePct,...}} shape
// used throughout PortfolioTerminal/HomePage/AnalysisPage). This copies
// only what's needed to render the share card — never a live reference —
// so the source holdings/portfolio stays private; only what the user
// actively chose to attach becomes public on the post. Metrics/alerts/
// allocation are computed with the exact same pMet/computeAlerts/groupBy
// helpers AnalysisPage's own Risk/Allocation tabs use, so numbers a viewer
// sees here match what the poster themselves would see in Analysis.
function buildSnapshotFromHoldings(holdings: any[], sourceName: string): PortfolioSnapshot | null {
  if (!holdings?.length) return null;
  const m = pMet(holdings);
  if (!m || m.total <= 0) return null;
  const rows: PortfolioSnapshotHolding[] = holdings
    .map((h: any) => ({
      ticker: h.asset?.ticker || h.asset?.symbol || "?",
      name: h.asset?.shortName || h.asset?.ticker || "Unknown",
      category: h.asset?.category || "OTHER",
      sector: h.asset?.sector || h.asset?.industry || null,
      value: h.value || 0,
      weightPct: ((h.value || 0) / m.total) * 100,
      dayChangePct: h.asset?.dayChangePct ?? null,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalValue: m.total,
    baseCurrency: "USD",
    sourceName,
    holdings: rows,
    metrics: {
      weightedReturn: m.wRet,
      weightedVol: m.wVol,
      weightedBeta: m.wBeta,
      weightedDividendYield: m.wDiv,
      weightedDayChangePct: m.wDay,
      sharpe: m.sharpe,
      hhi: m.hhi,
      sectorCount: m.sectors,
      geoCount: m.geos,
    },
    alerts: computeAlerts(holdings, m).map((a: any) => ({ sev: a.sev, title: a.title, detail: a.detail, metric: a.metric })),
    allocationByCategory: groupBy(holdings, "category", m.total),
    allocationBySector: groupBy(holdings, "sector", m.total),
    allocationByGeo: groupBy(holdings, "geo", m.total),
  };
}

const SNAPSHOT_CHART_TOP_N = 7;

function snapshotChartRows(snapshot: PortfolioSnapshot) {
  const sorted = [...snapshot.holdings].sort((a, b) => b.weightPct - a.weightPct);
  const top = sorted.slice(0, SNAPSHOT_CHART_TOP_N);
  const rest = sorted.slice(SNAPSHOT_CHART_TOP_N);
  const restPct = rest.reduce((s, h) => s + h.weightPct, 0);
  const rows: { name: string; value: number; change: number | null }[] =
    top.map((h) => ({ name: h.ticker, value: h.weightPct, change: h.dayChangePct }));
  if (rest.length) rows.push({ name: `Other (${rest.length})`, value: restPct, change: null });
  return rows;
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: B.panel2, border: `1px solid ${B.border}`, borderRadius: 8, padding: "8px 10px", flex: "1 1 92px", minWidth: 92 }}>
      <div style={{ fontSize: 9, color: B.gray3, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || B.gray1, fontFamily: FONT }}>{value}</div>
    </div>
  );
}

function AllocationBars({ title, data }: { title: string; data?: { name: string; value: number; pct: number }[] }) {
  if (!data?.length) return null;
  return (
    <div style={{ flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.slice(0, 6).map((d, i) => (
          <div key={d.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: B.gray1, fontFamily: FONT, marginBottom: 2 }}>
              <span>{d.name}</span><span style={{ fontWeight: 700 }}>{d.pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: B.panel2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(d.pct, 100)}%`, height: "100%", background: PIE_COLS[i % PIE_COLS.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The full, rich display shown in a post's detail view: performance KPIs,
// top-holdings donut, category/sector allocation, and the same risk-alert
// logic AnalysisPage's Risk tab runs (concentration, volatility, sharpe,
// beta, diversification).
function PortfolioShareCard({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const chartRows = useMemo(() => snapshotChartRows(snapshot), [snapshot]);
  // Posts shared before metrics/alerts/allocation were added to the
  // snapshot shape only have {totalValue, baseCurrency, sourceName,
  // holdings} stored — these fields are absent, not just empty, on those
  // older rows, so every access below must tolerate that.
  const metrics = snapshot.metrics;
  const alerts = snapshot.alerts || [];
  const wDay = metrics?.weightedDayChangePct ?? 0;

  return (
    <div style={{
      background: B.panel, border: `1px solid ${B.blue}`, borderRadius: 14,
      padding: "16px 18px", marginTop: 14, boxShadow: `0 0 0 1px ${B.blue}22`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: B.blue }}>
        <BarChartIcon />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", fontFamily: FONT }}>SHARED PORTFOLIO</span>
        <span style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, fontWeight: 400 }}>· {snapshot.sourceName}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>
          ${snapshot.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: pCol(wDay) }}>
          {wDay >= 0 ? "+" : ""}{wDay.toFixed(2)}% today
        </span>
        <span style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>{snapshot.holdings.length} positions</span>
      </div>

      {metrics && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <MiniKpi label="EXP. RETURN" value={`${metrics.weightedReturn >= 0 ? "+" : ""}${metrics.weightedReturn.toFixed(1)}%`} color={pCol(metrics.weightedReturn)} />
          <MiniKpi label="VOLATILITY" value={`${metrics.weightedVol.toFixed(1)}%`} />
          <MiniKpi label="SHARPE" value={metrics.sharpe.toFixed(2)} />
          <MiniKpi label="BETA" value={metrics.weightedBeta.toFixed(2)} />
          <MiniKpi label="DIV YIELD" value={`${metrics.weightedDividendYield.toFixed(1)}%`} />
          <MiniKpi label="SECTORS/GEO" value={`${metrics.sectorCount} / ${metrics.geoCount}`} />
        </div>
      )}

      <div style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 8 }}>TOP HOLDINGS</div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
          <PieChart>
            <Pie data={chartRows} cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={1} dataKey="value" strokeWidth={0}>
              {chartRows.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <table style={{ flex: "1 1 180px", borderCollapse: "collapse", fontFamily: FONT }}>
          <tbody>
            {chartRows.map((row, i) => (
              <tr key={row.name}>
                <td style={{ padding: "3px 0", fontSize: 12, color: B.gray1 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLS[i % PIE_COLS.length], display: "inline-block", marginRight: 6 }} />
                  {row.name}
                </td>
                <td style={{ padding: "3px 0", fontSize: 12, color: B.gray1, textAlign: "right", fontWeight: 700 }}>{row.value.toFixed(1)}%</td>
                <td style={{ padding: "3px 0 3px 10px", fontSize: 11, textAlign: "right", color: row.change == null ? B.gray3 : row.change >= 0 ? B.green : B.red }}>
                  {row.change == null ? "—" : `${row.change >= 0 ? "+" : ""}${row.change.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(snapshot.allocationByCategory?.length || snapshot.allocationBySector?.length || snapshot.allocationByGeo?.length) ? (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
          <AllocationBars title="BY CATEGORY" data={snapshot.allocationByCategory} />
          <AllocationBars title="BY SECTOR" data={snapshot.allocationBySector} />
          <AllocationBars title="BY GEOGRAPHY" data={snapshot.allocationByGeo} />
        </div>
      ) : null}

      {alerts.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: B.gray3, letterSpacing: "0.06em", fontFamily: FONT, marginBottom: 8 }}>RISK ALERTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map((a, i) => {
              const style = SEV_STYLE[a.sev];
              return (
                <div key={i} style={{ border: `1px solid ${style.border}`, background: style.bg, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: style.text, fontFamily: FONT }}>{style.icon} {a.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: style.text, fontFamily: FONT, flexShrink: 0 }}>{a.metric}</span>
                  </div>
                  <div style={{ fontSize: 11, color: B.gray2, fontFamily: FONT, lineHeight: 1.4 }}>{a.detail}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// The compact teaser shown inside a post card in the channel's post list.
function PortfolioBadge({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const highRisk = (snapshot.alerts || []).some((a) => a.sev === "HIGH");
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4,
      padding: "4px 8px", background: B.panel2, border: `1px solid ${B.border}`, borderRadius: 6, color: B.blue,
    }}>
      <BarChartIcon size={12} />
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT }}>Portfolio attached</span>
      <span style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, fontWeight: 400 }}>
        · ${snapshot.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {snapshot.holdings.length} positions
      </span>
      {highRisk && <span style={{ fontSize: 11, color: SEV_STYLE.HIGH.text, fontWeight: 700, fontFamily: FONT }}>{SEV_STYLE.HIGH.icon} risk flag</span>}
    </div>
  );
}

// Toggle + source picker shown inside the new-post form. `holdings` is the
// signed-in user's live current holdings (passed down from PortfolioTerminal);
// savedPortfolios are lazy-loaded on first open since most posts won't attach one.
function PortfolioAttachPicker({ holdings, value, onChange }: {
  holdings: any[]; value: PortfolioSnapshot | null; onChange: (s: PortfolioSnapshot | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<any[] | null>(null);
  const [source, setSource] = useState<string>("");

  const hasCurrent = (holdings?.length || 0) > 0;

  useEffect(() => {
    if (open && saved === null) {
      listPortfolios().then(setSaved).catch(() => setSaved([]));
    }
  }, [open, saved]);

  const pick = (src: string) => {
    setSource(src);
    if (!src) { onChange(null); return; }
    if (src === "current") { onChange(buildSnapshotFromHoldings(holdings, "Current portfolio")); return; }
    const p = (saved || []).find((x) => x.id === src);
    onChange(p ? buildSnapshotFromHoldings(p.holdings || [], p.name) : null);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
        background: "transparent", border: `1px dashed ${B.border}`, color: B.blue, borderRadius: 6,
        padding: "6px 10px", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer",
      }}>
        <BarChartIcon size={12} /> ATTACH A PORTFOLIO
      </button>
    );
  }

  return (
    <div style={{ background: B.panel2, border: `1px solid ${B.border}`, borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: B.gray2, fontFamily: FONT, fontWeight: 700, letterSpacing: "0.04em" }}>ATTACH A PORTFOLIO</span>
        <button type="button" onClick={() => { setOpen(false); setSource(""); onChange(null); }} style={{
          background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700,
        }}>REMOVE</button>
      </div>
      {!hasCurrent && !(saved && saved.length) ? (
        <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>Add positions in Portfolio first to share one.</div>
      ) : (
        <select value={source} onChange={(e) => pick(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          <option value="">Select a portfolio…</option>
          {hasCurrent && <option value="current">Current portfolio ({holdings.length} positions)</option>}
          {(saved || []).map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({(p.holdings || []).length} positions)</option>
          ))}
        </select>
      )}
      {value && <PortfolioBadge snapshot={value} />}
    </div>
  );
}

// Shown instead of any create/comment form whenever a signed-in user hasn't
// picked a handle yet — participating (posting, commenting, creating a
// channel) requires one, matching how the author_name DB trigger resolves
// display identity (profiles.username first, auth-derived name as fallback).
function UsernamePrompt({ onSet }: { onSet: (username: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const valid = /^[a-z0-9_]{3,20}$/.test(value);

  const submit = async () => {
    if (busy || !valid) return;
    setBusy(true); setErr("");
    try {
      const { username } = await srvSetUsername({ data: { username: value } });
      onSet(username);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: B.panel, border: `1px solid ${B.blue}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: B.gray2, fontFamily: FONT, lineHeight: 1.5 }}>
        Choose a username to participate in the community (3-20 characters: lowercase letters, numbers, underscore).
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          placeholder="e.g. john_doe" maxLength={20}
          style={{ ...inputStyle, flex: "1 1 160px" }}
        />
        <button disabled={busy || !valid} onClick={submit} style={primaryBtnStyle(!busy && valid)}>
          {busy ? "..." : "SAVE USERNAME"}
        </button>
      </div>
      {err && <div style={{ fontSize: 11, color: B.red, fontFamily: FONT }}>{err}</div>}
    </div>
  );
}

// Shared between the Home feed and a single channel's post list.
// `showChannel` shows the parent-channel badge — relevant on Home (an
// aggregated cross-channel feed) but redundant inside a channel you're
// already looking at.
function PostCard({ post, myVote, disabled, onVote, onOpen, showChannel }: {
  post: CommunityPost; myVote: number; disabled: boolean; onVote: (v: 1 | -1) => void; onOpen: () => void; showChannel?: boolean;
}) {
  return (
    <div onClick={onOpen} style={{
      background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "12px 14px",
      display: "flex", gap: 12, cursor: "pointer",
    }}>
      <VoteControl score={post.score} myVote={myVote} disabled={disabled} onVote={onVote} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 4 }}>{post.title}</div>
        <div style={{
          fontSize: 12, color: B.gray2, fontFamily: FONT, marginBottom: 6,
          overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }}>{post.body}</div>
        <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {showChannel && post.community_channels && (
            <span style={{ color: B.blue, fontWeight: 700 }}>{post.community_channels.name}</span>
          )}
          <span>u/{post.author_name}</span>
          <span>{fmtDate(post.created_at)}</span>
          <span>{post.comment_count} comments</span>
        </div>
        {post.portfolio_snapshot && <PortfolioBadge snapshot={post.portfolio_snapshot} />}
      </div>
    </div>
  );
}

// The Reddit-style aggregated feed across every channel: Recent / Popular
// (all-time top score) / Trending (top score in the last 3 days).
function HomeFeed({ user, onOpenPost }: { user: any; onOpenPost: (id: string) => void }) {
  const [sort, setSort] = useState<"recent" | "popular" | "trending">("recent");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await listAllCommunityPosts({ data: { sort } });
      setPosts(rows);
      if (user) {
        const votes = await listMyVotes({ data: { postIds: rows.map((r) => r.id) } });
        setMyVotes(votes);
      } else {
        setMyVotes({});
      }
    } catch (e: any) {
      setError(e.message || "Error loading feed");
    } finally {
      setLoading(false);
    }
  }, [sort, user]);

  useEffect(() => { load(); }, [load]);

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
        COMMUNITY — HOME
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <FKey label="RECENT" active={sort === "recent"} onClick={() => setSort("recent")} />
        <FKey label="POPULAR" active={sort === "popular"} onClick={() => setSort("popular")} />
        <FKey label="TRENDING" active={sort === "trending"} onClick={() => setSort("trending")} />
      </div>

      {error && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, marginBottom: 10, fontFamily: FONT }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          {sort === "trending" ? "Nothing trending in the last 3 days." : "No discussions yet — pick a channel and be the first to write one."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} myVote={myVotes[p.id] || 0} disabled={!user} onVote={(v) => vote(p.id, v)} onOpen={() => onOpenPost(p.id)} showChannel />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelList({ user, username, isAdmin, onUsernameSet, onOpen }: {
  user: any; username: string | null | undefined; isAdmin: boolean; onUsernameSet: (u: string) => void; onOpen: (c: CommunityChannel) => void;
}) {
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setChannels(await listChannels());
    } catch (e: any) {
      setError(e.message || "Error loading channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (creating || !name.trim()) return;
    setCreating(true); setError("");
    try {
      const ch = await createChannel({ data: { name, description: desc } });
      setName(""); setDesc(""); setShowForm(false);
      await load();
      onOpen(ch);
    } catch (e: any) {
      setError(e.message || "Error creating channel");
    } finally {
      setCreating(false);
    }
  };

  const removeChannel = async (e: any, c: CommunityChannel) => {
    e.stopPropagation();
    if (!window.confirm(`Delete channel "${c.name}" and all its discussions?`)) return;
    try {
      await deleteCommunityChannel({ data: { id: c.id } });
      load();
    } catch (err: any) {
      setError(err.message || "Error deleting channel");
    }
  };

  const q = search.trim().toLowerCase();
  const filteredChannels = q
    ? channels.filter((c) => c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))
    : channels;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 10, fontFamily: FONT }}>
        COMMUNITY — CHANNELS
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT }}>Choose a channel to read or join the discussions.</div>
        {user ? (
          <button disabled={username === undefined} onClick={() => setShowForm((s) => !s)} style={{
            background: B.blue, border: "none", color: B.white, padding: "8px 14px", borderRadius: 6,
            fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
            cursor: username === undefined ? "default" : "pointer", opacity: username === undefined ? 0.5 : 1,
          }}>{showForm ? "CANCEL" : "+ NEW CHANNEL"}</button>
        ) : (
          <Link to="/auth" style={{ fontSize: 12, color: B.blue, fontFamily: FONT, fontWeight: 700, textDecoration: "none" }}>
            SIGN IN TO PARTICIPATE →
          </Link>
        )}
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: B.gray3, display: "flex", pointerEvents: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels..."
          style={{ ...inputStyle, width: "100%", paddingLeft: 30 }}
        />
      </div>

      {showForm && user && (
        username === null
          ? <div style={{ marginBottom: 12 }}><UsernamePrompt onSet={onUsernameSet} /></div>
          : (
            <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name (e.g. US Stocks)" maxLength={60} style={inputStyle} />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={300} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button disabled={!name.trim() || creating} onClick={submit} style={primaryBtnStyle(!!name.trim() && !creating)}>
                  {creating ? "CREATING..." : "CREATE CHANNEL"}
                </button>
              </div>
            </div>
          )
      )}

      {error && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, marginBottom: 10, fontFamily: FONT }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING...</div>
      ) : channels.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          No channels yet, be the first to create one.
        </div>
      ) : filteredChannels.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          No channels match "{search.trim()}".
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {filteredChannels.map((c) => (
            <div key={c.id} onClick={() => onOpen(c)} style={{
              background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", position: "relative",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: B.blue, fontFamily: FONT, marginBottom: 4 }}>{c.name}</div>
                {user && (user.user_id === c.created_by || isAdmin) && (
                  <button onClick={(e) => removeChannel(e, c)} style={{
                    background: "none", border: "none", color: B.red, cursor: "pointer",
                    fontFamily: FONT, fontSize: 10, fontWeight: 700, padding: 0, flexShrink: 0,
                  }}>DELETE</button>
                )}
              </div>
              {c.description && (
                <div style={{ fontSize: 12, color: B.gray2, fontFamily: FONT, marginBottom: 6 }}>{c.description}</div>
              )}
              <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>{c.post_count} discussions</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelPosts({ channel, user, username, holdings, onUsernameSet, onOpenPost, onBack }: {
  channel: CommunityChannel; user: any; username: string | null | undefined; holdings: any[];
  onUsernameSet: (u: string) => void; onOpenPost: (id: string) => void; onBack: () => void;
}) {
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await listCommunityPosts({ data: { sort, channelId: channel.id } });
      setPosts(rows);
      if (user) {
        const votes = await listMyVotes({ data: { postIds: rows.map((r) => r.id) } });
        setMyVotes(votes);
      } else {
        setMyVotes({});
      }
    } catch (e: any) {
      setError(e.message || "Error loading discussions");
    } finally {
      setLoading(false);
    }
  }, [sort, user, channel.id]);

  useEffect(() => { load(); }, [load]);

  const submitPost = async () => {
    if (!user || posting || !title.trim() || !body.trim()) return;
    setPosting(true); setError("");
    try {
      await createCommunityPost({ data: { title, body, channelId: channel.id, portfolioSnapshot } });
      setTitle(""); setBody(""); setPortfolioSnapshot(null); setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.message || "Error publishing");
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
      <button onClick={onBack} style={backBtnStyle}>← CHANNELS</button>
      <div style={{ fontSize: 16, fontWeight: 700, color: B.gray1, fontFamily: FONT, margin: "10px 0 2px" }}>{channel.name}</div>
      {channel.description && (
        <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginBottom: 10 }}>{channel.description}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <FKey label="RECENT" active={sort === "recent"} onClick={() => setSort("recent")} />
          <FKey label="TOP VOTED" active={sort === "top"} onClick={() => setSort("top")} />
        </div>
        {user ? (
          <button disabled={username === undefined} onClick={() => setShowForm((s) => !s)} style={{
            background: B.blue, border: "none", color: B.white, padding: "8px 14px", borderRadius: 6,
            fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
            cursor: username === undefined ? "default" : "pointer", opacity: username === undefined ? 0.5 : 1,
          }}>{showForm ? "CANCEL" : "+ NEW DISCUSSION"}</button>
        ) : (
          <Link to="/auth" style={{ fontSize: 12, color: B.blue, fontFamily: FONT, fontWeight: 700, textDecoration: "none" }}>
            SIGN IN TO PARTICIPATE →
          </Link>
        )}
      </div>

      {showForm && user && (
        username === null
          ? <div style={{ marginBottom: 12 }}><UsernamePrompt onSet={onUsernameSet} /></div>
          : (
            <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={200} style={inputStyle} />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write something..." rows={4} maxLength={8000} style={{ ...inputStyle, resize: "vertical" }} />
              <PortfolioAttachPicker holdings={holdings} value={portfolioSnapshot} onChange={setPortfolioSnapshot} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button disabled={!title.trim() || !body.trim() || posting} onClick={submitPost} style={primaryBtnStyle(!!title.trim() && !!body.trim() && !posting)}>
                  {posting ? "PUBLISHING..." : "PUBLISH"}
                </button>
              </div>
            </div>
          )
      )}

      {error && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: B.red, border: `1px solid ${B.red}`, borderRadius: 6, marginBottom: 10, fontFamily: FONT }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
          No discussions yet, be the first to write one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} myVote={myVotes[p.id] || 0} disabled={!user} onVote={(v) => vote(p.id, v)} onOpen={() => onOpenPost(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetail({ postId, user, username, isAdmin, onUsernameSet, onBack }: {
  postId: string; user: any; username: string | null | undefined; isAdmin: boolean; onUsernameSet: (u: string) => void; onBack: () => void;
}) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [myVote, setMyVote] = useState(0);
  const [myCommentVotes, setMyCommentVotes] = useState<Record<string, number>>({});
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
        const [votes, commentVotes] = await Promise.all([
          listMyVotes({ data: { postIds: [p.id] } }),
          listMyCommentVotes({ data: { commentIds: cs.map((c) => c.id) } }),
        ]);
        setMyVote(votes[p.id] || 0);
        setMyCommentVotes(commentVotes);
      } else {
        setMyVote(0);
        setMyCommentVotes({});
      }
    } catch (e: any) {
      setError(e.message || "Error loading discussion");
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

  const voteComment = async (commentId: string, value: 1 | -1) => {
    if (!user) return;
    const current = myCommentVotes[commentId] || 0;
    const delta = current === value ? -value : value - current;
    setComments((cs) => cs.map((c) => (c.id === commentId ? { ...c, score: c.score + delta } : c)));
    setMyCommentVotes((v) => ({ ...v, [commentId]: current === value ? 0 : value }));
    try {
      if (current === value) await removeCommentVote({ data: { commentId } });
      else await setCommentVote({ data: { commentId, value } });
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
      setError(e.message || "Error posting comment");
    } finally {
      setPosting(false);
    }
  };

  const removePost = async () => {
    if (!post || !user || (user.user_id !== post.user_id && !isAdmin)) return;
    if (!window.confirm("Delete this discussion?")) return;
    try {
      await deleteCommunityPost({ data: { id: post.id } });
      onBack();
    } catch (e: any) {
      setError(e.message || "Error deleting");
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteCommunityComment({ data: { id } });
      setComments((cs) => cs.filter((c) => c.id !== id));
      setPost((p) => (p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
    } catch (e: any) {
      setError(e.message || "Error deleting");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING...</div>;
  }
  if (!post) {
    return (
      <div>
        <button onClick={onBack} style={backBtnStyle}>← BACK</button>
        <div style={{ padding: 20, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>Discussion not found.</div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}>← BACK</button>
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
            {post.community_channels && (
              <span style={{ color: B.blue, fontWeight: 700 }}>{post.community_channels.name}</span>
            )}
            <span>u/{post.author_name}</span>
            <span>{fmtDate(post.created_at)}</span>
            {user && (user.user_id === post.user_id || isAdmin) && (
              <button onClick={removePost} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: 0 }}>
                DELETE
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{post.body}</div>
        </div>
      </div>

      {post.portfolio_snapshot && <PortfolioShareCard snapshot={post.portfolio_snapshot} />}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: B.gray2, letterSpacing: "0.06em", marginBottom: 8, fontFamily: FONT }}>
          {comments.length} COMMENTS
        </div>

        {user ? (
          username === undefined ? null : username === null ? (
            <div style={{ marginBottom: 14 }}><UsernamePrompt onSet={onUsernameSet} /></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Write a comment..." rows={3} maxLength={3000} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button disabled={!commentBody.trim() || posting} onClick={submitComment} style={primaryBtnStyle(!!commentBody.trim() && !posting)}>
                  {posting ? "SENDING..." : "COMMENT"}
                </button>
              </div>
            </div>
          )
        ) : (
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, marginBottom: 14 }}>
            <Link to="/auth" style={{ color: B.blue, fontWeight: 700, textDecoration: "none" }}>Sign in</Link> to leave a comment.
          </div>
        )}

        {comments.length === 0 ? (
          <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, padding: "10px 0" }}>No comments yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10 }}>
                <VoteControl score={c.score} myVote={myCommentVotes[c.id] || 0} disabled={!user} onVote={(v) => voteComment(c.id, v)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: B.gray2, fontWeight: 700 }}>u/{c.author_name}</span>
                    <span>{fmtDate(c.created_at)}</span>
                    {user && (user.user_id === c.user_id || isAdmin) && (
                      <button onClick={() => removeComment(c.id)} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: 0, marginLeft: "auto" }}>
                        DELETE
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, whiteSpace: "pre-wrap" }}>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type PostOrigin = { mode: "home" } | { mode: "channel"; channel: CommunityChannel };

type View =
  | { mode: "home" }
  | { mode: "channels" }
  | { mode: "channel"; channel: CommunityChannel }
  | { mode: "post"; postId: string; back: PostOrigin };

export default function CommunityPage({ holdings }: { holdings?: any[] }) {
  const { user } = useUser();
  const isAdmin = user?.email === OWNER_EMAIL;
  const [view, setView] = useState<View>({ mode: "home" });
  // undefined = not loaded yet, null = signed in but no username set.
  const [username, setUsernameState] = useState<string | null | undefined>(undefined);
  const [pendingPost, setPendingPost] = usePersistentState<string>("community_pending_post", "");

  useEffect(() => {
    if (!user) { setUsernameState(undefined); return; }
    let alive = true;
    getMyUsername().then((u) => { if (alive) setUsernameState(u); }).catch(() => { if (alive) setUsernameState(null); });
    return () => { alive = false; };
  }, [user]);

  // A notification's "New comment on your post" click sets this (via the
  // same localStorage-handoff pattern the AI advisor uses for pending
  // prompts/conversations) and switches the page to "community" — pick it
  // up here and jump straight to that post's detail view.
  useEffect(() => {
    if (!pendingPost) return;
    setView({ mode: "post", postId: pendingPost, back: { mode: "home" } });
    setPendingPost("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPost]);

  const showTopNav = view.mode === "home" || view.mode === "channels";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, padding: 12 }}>
        {showTopNav && (
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            <FKey label="HOME" active={view.mode === "home"} onClick={() => setView({ mode: "home" })} />
            <FKey label="CHANNELS" active={view.mode === "channels"} onClick={() => setView({ mode: "channels" })} />
          </div>
        )}
        {view.mode === "home" && (
          <HomeFeed user={user} onOpenPost={(postId) => setView({ mode: "post", postId, back: { mode: "home" } })} />
        )}
        {view.mode === "channels" && (
          <ChannelList user={user} username={username} isAdmin={isAdmin} onUsernameSet={setUsernameState} onOpen={(channel) => setView({ mode: "channel", channel })} />
        )}
        {view.mode === "channel" && (
          <ChannelPosts
            channel={view.channel} user={user} username={username} holdings={holdings || []} onUsernameSet={setUsernameState}
            onOpenPost={(postId) => setView({ mode: "post", postId, back: { mode: "channel", channel: view.channel } })}
            onBack={() => setView({ mode: "channels" })}
          />
        )}
        {view.mode === "post" && (
          <PostDetail
            postId={view.postId} user={user} username={username} isAdmin={isAdmin} onUsernameSet={setUsernameState}
            onBack={() => setView(view.back)}
          />
        )}
      </div>
    </div>
  );
}
