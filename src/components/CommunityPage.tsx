import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { B, PIE_COLS, pMet, pCol, computeAlerts, groupBy, groupBySectorLookThrough, SEV_STYLE } from "@/lib/uiShared";
import { useUser } from "@/hooks/useUser";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useIsMobile } from "@/hooks/use-mobile";
import { getMyUsername, setUsername as srvSetUsername, listPortfolios } from "@/lib/profile.functions";
import { OWNER_EMAIL } from "@/lib/admin";
import {
  listChannels, createChannel, deleteCommunityChannel, updateChannelRules,
  listAllCommunityPosts, listCommunityPosts, getCommunityPost, createCommunityPost, deleteCommunityPost,
  listCommunityComments, createCommunityComment, deleteCommunityComment,
  listMyVotes, setVote, removeVote,
  listMyCommentVotes, setCommentVote, removeCommentVote,
  getCommunityAbout, getTrendingChannels,
  listFollowedChannelIds, followChannel, unfollowChannel, listFollowedPosts,
} from "@/lib/community.functions";
import type { CommunityChannel, CommunityPost, CommunityComment, CommunityPostType, PortfolioSnapshot, PortfolioSnapshotHolding } from "@/lib/community.functions";

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

function CommentIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
    </svg>
  );
}

function BookmarkIcon({ filled, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronIcon({ size = 12, open }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// We don't have real profile pictures, so avatars are a colored circle with
// the username's initial rather than a stock-photo-style placeholder that
// would look like a real (but fake) person. Color is a deterministic hash
// of the username — reuses the existing PIE_COLS palette, not a new one.
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const color = PIE_COLS[hashStr(name || "?") % PIE_COLS.length];
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color, color: "#000",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      fontSize: Math.round(size * 0.42), fontWeight: 700, fontFamily: FONT,
    }}>{initial}</div>
  );
}

// Colors come from B.* only (no new hex) — background stays the neutral
// panel color in both themes, with the type's own color used just for the
// text/border, which reads fine without needing a CSS color-mix/alpha trick
// on a custom-property value (which "B.green + alpha suffix" can't do).
const POST_TYPE_META: Record<CommunityPostType, { label: string; color: string }> = {
  portfolio_review: { label: "Portfolio Review", color: B.green },
  question: { label: "Question", color: B.cyan },
  discussion: { label: "Discussion", color: B.blueL },
  market_talk: { label: "Market Talk", color: B.yellow },
};
function PostTypeTag({ type }: { type: CommunityPostType }) {
  const meta = POST_TYPE_META[type] || POST_TYPE_META.discussion;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      background: B.panel2, color: meta.color, border: `1px solid ${meta.color}`,
      fontSize: 10, fontWeight: 700, fontFamily: FONT, letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{meta.label}</span>
  );
}

const actionBtnStyle: any = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "none", border: "none", color: B.gray3, cursor: "pointer",
  fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: "4px 6px", borderRadius: 6,
};

// Comments (opens the post), Share (copies a direct link), Save (a
// localStorage bookmark — no dedicated table for this yet) and a "..."
// menu with placeholder moderation actions. Shown under every post card
// and again at the top of the post detail view.
function PostActions({ post, onOpenComments }: { post: CommunityPost; onOpenComments?: () => void }) {
  const [saved, setSaved] = usePersistentState<string[]>("community_saved_posts", []);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSaved = saved.includes(post.id);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const share = async (e: any) => {
    e.stopPropagation();
    const url = `${window.location.origin}/terminal#community-post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — no fallback UI for now.
    }
  };

  const toggleSave = (e: any) => {
    e.stopPropagation();
    setSaved((s) => (isSaved ? s.filter((id) => id !== post.id) : [...s, post.id]));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      <button onClick={onOpenComments} style={actionBtnStyle} disabled={!onOpenComments}>
        <CommentIcon /> {post.comment_count}
      </button>
      <button onClick={share} style={actionBtnStyle}>
        <ShareIcon /> {copied ? "Link copied" : "Share"}
      </button>
      <button onClick={toggleSave} style={{ ...actionBtnStyle, color: isSaved ? B.blue : B.gray3 }}>
        <BookmarkIcon filled={isSaved} /> {isSaved ? "Saved" : "Save"}
      </button>
      <div ref={menuRef} style={{ position: "relative", marginLeft: "auto" }}>
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} style={actionBtnStyle}>•••</button>
        {menuOpen && (
          <div style={{
            position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 10, minWidth: 140,
            background: B.panel, border: `1px solid ${B.border}`, borderRadius: 8, overflow: "hidden",
          }}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
              color: B.gray1, cursor: "pointer", fontFamily: FONT, fontSize: 12, padding: "8px 12px",
            }}>Report</button>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
              color: B.gray1, cursor: "pointer", fontFamily: FONT, fontSize: 12, padding: "8px 12px",
            }}>Hide</button>
          </div>
        )}
      </div>
    </div>
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
export function buildSnapshotFromHoldings(holdings: any[], sourceName: string): PortfolioSnapshot | null {
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
    allocationBySector: groupBySectorLookThrough(holdings, m.total),
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
function PostPortfolioWidget({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const isMobile = useIsMobile();
  const data = snapshot.allocationByCategory?.length
    ? snapshot.allocationByCategory
    : snapshot.allocationBySector?.length
      ? snapshot.allocationBySector
      : null;

  if (!data || !data.length) return null;

  const top = [...data].sort((a, b) => b.pct - a.pct).slice(0, 4);

  return (
    <div style={{
      width: isMobile ? "100%" : 190, flexShrink: isMobile ? undefined : 0,
      background: B.panel2, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ResponsiveContainer width={64} height={64}>
          <PieChart>
            <Pie data={top} cx="50%" cy="50%" innerRadius={18} outerRadius={30} paddingAngle={1} dataKey="pct" strokeWidth={0}>
              {top.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 0 }}>
          {top.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLS[i % PIE_COLS.length], flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: B.gray2, fontFamily: FONT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>{d.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function PortfolioBadge({ snapshot }: { snapshot: PortfolioSnapshot }) {
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
  const isMobile = useIsMobile();
  return (
    <div onClick={onOpen} style={{
      background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "12px 14px",
      display: "flex", gap: 12, cursor: "pointer",
    }}>
      <VoteControl score={post.score} myVote={myVote} disabled={disabled} onVote={onVote} />
      {/* The attached-portfolio widget is a fixed 190px side panel on
          desktop, but that same fixed width squeezed the text column to
          nothing on narrow screens and visually overlapped it — stack
          them instead of forcing a row once there isn't room. */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <PostTypeTag type={post.post_type} />
            {showChannel && post.community_channels && (
              <span style={{ fontSize: 11, color: B.blue, fontWeight: 700, fontFamily: FONT }}>{post.community_channels.name}</span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 4 }}>{post.title}</div>
          <div style={{
            fontSize: 12, color: B.gray2, fontFamily: FONT, marginBottom: 6,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
          }}>{post.body}</div>
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Avatar name={post.author_name} size={18} />
            <span>u/{post.author_name}</span>
            <span>· {fmtDate(post.created_at)}</span>
          </div>
          {post.portfolio_snapshot && <PortfolioBadge snapshot={post.portfolio_snapshot} />}
          <PostActions post={post} onOpenComments={onOpen} />
        </div>
        {post.portfolio_snapshot && <PostPortfolioWidget snapshot={post.portfolio_snapshot} />}
      </div>
    </div>
  );
}


// The single Reddit-style feed: sort tabs (Hot/New/Top/Following), an "All
// Topics" channel dropdown (replacing the old separate channel-list page),
// the post list, and the right-rail sidebar (About/Trending/Rules). Voting,
// channel CRUD, and post/comment creation all reuse the exact same
// community.functions.ts calls the old Home/Channels/ChannelPosts views did
// — only the layout and the sort/filter UI around them changed.
function Feed({ user, username, isAdmin, holdings, onUsernameSet, onOpenPost, selectedChannel, onSelectChannel }: {
  user: any; username: string | null | undefined; isAdmin: boolean; holdings: any[];
  onUsernameSet: (u: string) => void; onOpenPost: (id: string) => void;
  // Lifted to CommunityPage so it survives this component unmounting when
  // the view switches to a post's detail and back (a plain local useState
  // here would silently reset to "All Topics" every time you open a post).
  selectedChannel: CommunityChannel | null; onSelectChannel: (c: CommunityChannel | null) => void;
}) {
  const isMobile = useIsMobile();

  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const setSelectedChannel = onSelectChannel;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [channelRulesText, setChannelRulesText] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [rulesDraft, setRulesDraft] = useState("");
  const [savingRules, setSavingRules] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [sortTab, setSortTab] = useState<"hot" | "new" | "top" | "following">("hot");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState<CommunityPostType>("discussion");
  const [formChannelId, setFormChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [posting, setPosting] = useState(false);

  const [about, setAbout] = useState<{ postCount: number; memberCount: number } | null>(null);
  const [trending, setTrending] = useState<{ id: string; name: string; count: number }[] | null>(null);
  const [rulesOpen, setRulesOpen] = useState(true);

  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState(false);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      setChannels(await listChannels());
    } catch (e: any) {
      setError(e.message || "Error loading topics");
    } finally {
      setChannelsLoading(false);
    }
  }, []);
  useEffect(() => { loadChannels(); }, [loadChannels]);

  const isFollowingTab = sortTab === "following";

  const loadPosts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = isFollowingTab
        ? await listFollowedPosts()
        : selectedChannel
        ? await listCommunityPosts({ data: { sort: "recent", channelId: selectedChannel.id } })
        : await listAllCommunityPosts({ data: { sort: "recent" } });
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
  }, [selectedChannel, user, isFollowingTab]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const loadFollowed = useCallback(async () => {
    if (!user) { setFollowedIds(new Set()); return; }
    try {
      setFollowedIds(new Set(await listFollowedChannelIds()));
    } catch {
      // supplementary to the Follow button's display; failing quietly
      // just leaves the button showing "+ FOLLOW" until the next load
    }
  }, [user]);
  useEffect(() => { loadFollowed(); }, [loadFollowed]);

  const toggleFollow = async () => {
    if (!selectedChannel || !user || followBusy) return;
    const id = selectedChannel.id;
    const wasFollowing = followedIds.has(id);
    setFollowBusy(true);
    try {
      if (wasFollowing) {
        await unfollowChannel({ data: { channelId: id } });
        setFollowedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        await followChannel({ data: { channelId: id } });
        setFollowedIds((s) => new Set(s).add(id));
      }
      if (isFollowingTab) loadPosts();
    } catch (e: any) {
      setError(e.message || "Error updating follow");
    } finally {
      setFollowBusy(false);
    }
  };

  // Sidebar data is supplementary — real numbers when available, but a
  // failure here shouldn't block the main feed, so errors are swallowed.
  const loadSidebar = useCallback(async () => {
    try {
      const [ab, tr] = await Promise.all([
        getCommunityAbout({ data: { channelId: selectedChannel?.id } }),
        getTrendingChannels(),
      ]);
      setAbout(ab);
      setTrending(tr);
    } catch {
      // sidebar is supplementary; leave it in its loading/empty state
    }
  }, [selectedChannel]);
  useEffect(() => { loadSidebar(); }, [loadSidebar]);

  // Switching topics while mid-edit would otherwise leave the previous
  // topic's rules draft open, now pointed at a different topic.
  useEffect(() => { setEditingRules(false); }, [selectedChannel]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [dropdownOpen]);

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
      loadPosts();
    }
  };

  const submitChannel = async () => {
    if (creatingChannel || !channelName.trim()) return;
    setCreatingChannel(true); setError("");
    try {
      const rules = channelRulesText.split("\n").map((r) => r.trim()).filter(Boolean);
      const ch = await createChannel({ data: { name: channelName, description: channelDesc, rules } });
      setChannelName(""); setChannelDesc(""); setChannelRulesText(""); setShowCreateChannel(false);
      await loadChannels();
      setSelectedChannel(ch);
      setDropdownOpen(false);
    } catch (e: any) {
      setError(e.message || "Error creating topic");
    } finally {
      setCreatingChannel(false);
    }
  };

  const startEditRules = () => {
    setRulesDraft((selectedChannel?.rules || []).join("\n"));
    setEditingRules(true);
  };

  const saveRules = async () => {
    if (!selectedChannel || savingRules) return;
    setSavingRules(true); setError("");
    try {
      const rules = rulesDraft.split("\n").map((r) => r.trim()).filter(Boolean);
      const updated = await updateChannelRules({ data: { id: selectedChannel.id, rules } });
      setSelectedChannel(updated);
      setEditingRules(false);
    } catch (e: any) {
      setError(e.message || "Error saving rules");
    } finally {
      setSavingRules(false);
    }
  };

  const deleteSelectedChannel = async () => {
    if (!selectedChannel) return;
    if (!window.confirm(`Delete topic "${selectedChannel.name}" and all its discussions?`)) return;
    try {
      await deleteCommunityChannel({ data: { id: selectedChannel.id } });
      setSelectedChannel(null);
      await loadChannels();
    } catch (e: any) {
      setError(e.message || "Error deleting topic");
    }
  };

  const submitPost = async () => {
    if (!user || posting || !title.trim() || !body.trim()) return;
    setPosting(true); setError("");
    try {
      await createCommunityPost({ data: { title, body, channelId: formChannelId || null, postType, portfolioSnapshot } });
      setTitle(""); setBody(""); setPortfolioSnapshot(null); setPostType("discussion"); setShowForm(false);
      await loadPosts();
    } catch (e: any) {
      setError(e.message || "Error publishing");
    } finally {
      setPosting(false);
    }
  };

  // Hot/New/Top are all computed client-side from the same fetched batch —
  // no separate server query per tab. Hot = score decayed by age, a simple
  // score / (hours-since-created + 2)^1.5 (no external ranking service).
  const sortedPosts = useMemo(() => {
    if (sortTab === "new") return [...posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortTab === "top") return [...posts].sort((a, b) => b.score - a.score);
    if (sortTab === "hot") {
      const hot = (p: CommunityPost) => {
        const hours = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
        return p.score / Math.pow(hours + 2, 1.5);
      };
      return [...posts].sort((a, b) => hot(b) - hot(a));
    }
    return posts;
  }, [posts, sortTab]);

  const communityName = selectedChannel ? selectedChannel.name : "Strategic Markets Community";
  const totalTrendingCount = (trending || []).reduce((s, t) => s + t.count, 0);

  // Community search — filters by name and description, live, as you type
  // (same behavior the old dedicated channel-browsing page had).
  const filteredChannels = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
  }, [channels, channelSearch]);

  const openComposer = () => {
    setFormChannelId(selectedChannel?.id || "");
    setShowForm(true);
  };

  if (channelsLoading) {
    return <div style={{ textAlign: "center", padding: 30, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>LOADING...</div>;
  }

  return (
    <>
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["hot", "new", "top", "following"] as const).map((t) => (
              <button key={t} onClick={() => setSortTab(t)} style={{
                background: sortTab === t ? B.blue : B.panel2,
                color: sortTab === t ? B.white : B.gray2,
                border: `1px solid ${sortTab === t ? B.blue : B.border}`,
                borderRadius: 999, padding: "6px 14px", fontFamily: FONT, fontSize: 12, fontWeight: 700,
                letterSpacing: "0.03em", cursor: "pointer", textTransform: "capitalize",
              }}>{t}</button>
            ))}
          </div>

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button onClick={() => setDropdownOpen((v) => !v)} style={{
              display: "flex", alignItems: "center", gap: 6, background: B.panel2, border: `1px solid ${B.border}`,
              borderRadius: 8, padding: "7px 12px", color: B.gray1, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              {selectedChannel ? selectedChannel.name : "All Topics"}
              <ChevronIcon open={dropdownOpen} />
            </button>
            {dropdownOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20, width: 260, maxHeight: 380, overflowY: "auto",
                background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, display: "flex", flexDirection: "column",
              }}>
                <div style={{ padding: 8, borderBottom: `1px solid ${B.border}` }}>
                  <input
                    autoFocus value={channelSearch} onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Search communities…" style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 8px" }}
                  />
                </div>
                <button onClick={() => { setSelectedChannel(null); setDropdownOpen(false); }} style={{
                  display: "block", width: "100%", textAlign: "left", background: !selectedChannel ? B.panel2 : "none", border: "none",
                  color: B.gray1, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: "10px 12px",
                }}>All Topics</button>
                {filteredChannels.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: 11, color: B.gray3, fontFamily: FONT }}>
                    No communities match "{channelSearch.trim()}".
                  </div>
                ) : filteredChannels.map((c) => (
                  <button key={c.id} onClick={() => { setSelectedChannel(c); setDropdownOpen(false); }} style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: selectedChannel?.id === c.id ? B.panel2 : "none", border: "none",
                    color: B.gray1, cursor: "pointer", fontFamily: FONT, padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                      <span>{c.name}</span>
                      <span style={{ color: B.gray3, fontWeight: 400 }}>{c.post_count}</span>
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 10, color: B.gray3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
                    )}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${B.border}` }}>
                  {user ? (
                    <button onClick={() => setShowCreateChannel((v) => !v)} style={{
                      display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                      color: B.blue, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: "10px 12px",
                    }}>+ Create Topic</button>
                  ) : (
                    <Link to="/auth" style={{ display: "block", padding: "10px 12px", color: B.blue, fontFamily: FONT, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Sign in to create a topic
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reddit-style "Create Post" bar — the entry point for posting on
            every screen size (desktop and mobile alike), instead of a
            button tucked into the app sidebar or the feed's corner. */}
        {!showForm && (
          <button onClick={openComposer} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10,
            padding: "10px 14px", marginBottom: 12, cursor: "pointer",
          }}>
            <Avatar name={username || "?"} size={28} />
            <span style={{ flex: 1, fontSize: 13, color: B.gray3, fontFamily: FONT }}>
              {user ? "Create Post" : "Sign in to create a post"}
            </span>
          </button>
        )}

        {showCreateChannel && user && (
          username === null ? (
            <div style={{ marginBottom: 12 }}><UsernamePrompt onSet={onUsernameSet} /></div>
          ) : (
            <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Topic name (e.g. US Stocks)" maxLength={60} style={inputStyle} />
              <textarea value={channelDesc} onChange={(e) => setChannelDesc(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={300} style={{ ...inputStyle, resize: "vertical" }} />
              <div>
                <div style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, marginBottom: 4 }}>RULES (optional, one per line) — you decide these as the topic's creator</div>
                <textarea value={channelRulesText} onChange={(e) => setChannelRulesText(e.target.value)} placeholder={"Be respectful\nNo spam\n..."} rows={3} maxLength={1000} style={{ ...inputStyle, width: "100%", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button disabled={!channelName.trim() || creatingChannel} onClick={submitChannel} style={primaryBtnStyle(!!channelName.trim() && !creatingChannel)}>
                  {creatingChannel ? "CREATING..." : "CREATE TOPIC"}
                </button>
              </div>
            </div>
          )
        )}

        {showForm && (
          !user ? (
            <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <Link to="/auth" style={{ color: B.blue, fontFamily: FONT, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Sign in to post →</Link>
            </div>
          ) : username === null ? (
            <div style={{ marginBottom: 12 }}><UsernamePrompt onSet={onUsernameSet} /></div>
          ) : (
            <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: B.gray2, fontFamily: FONT, fontWeight: 700, letterSpacing: "0.04em" }}>NEW POST</span>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>CANCEL</button>
              </div>
              <select value={formChannelId} onChange={(e) => setFormChannelId(e.target.value)} style={inputStyle}>
                <option value="">No topic (posts to Community Home)</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.keys(POST_TYPE_META) as CommunityPostType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setPostType(t)} style={{
                    padding: "5px 12px", borderRadius: 999, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: postType === t ? POST_TYPE_META[t].color : B.panel2,
                    color: postType === t ? B.bg : POST_TYPE_META[t].color,
                    border: `1px solid ${POST_TYPE_META[t].color}`,
                  }}>{POST_TYPE_META[t].label}</button>
                ))}
              </div>
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
        ) : isFollowingTab && !user ? (
          <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}>
            Sign in to follow topics and see their posts here.
          </div>
        ) : isFollowingTab && followedIds.size === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}>
            You're not following any topics yet — open a topic and hit + Follow.
          </div>
        ) : sortedPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: B.gray3, fontFamily: FONT, fontSize: 13 }}>
            {isFollowingTab ? "No posts yet in the topics you follow." : "No discussions yet — be the first to write one."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedPosts.map((p) => (
              <PostCard key={p.id} post={p} myVote={myVotes[p.id] || 0} disabled={!user} onVote={(v) => vote(p.id, v)} onOpen={() => onOpenPost(p.id)} showChannel={!selectedChannel || isFollowingTab} />
            ))}
          </div>
        )}
      </div>

      <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 10 }}>About {communityName}</div>
          {about ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: FONT }}>
                <span style={{ color: B.gray3 }}>Members</span><span style={{ color: B.gray1, fontWeight: 700 }}>{about.memberCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: FONT }}>
                <span style={{ color: B.gray3 }}>Posts</span><span style={{ color: B.gray1, fontWeight: 700 }}>{about.postCount}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT }}>Loading…</div>
          )}
          {selectedChannel && user && (
            <button disabled={followBusy} onClick={toggleFollow} style={{
              marginTop: 12,
              background: followedIds.has(selectedChannel.id) ? B.panel2 : B.blue,
              border: `1px solid ${followedIds.has(selectedChannel.id) ? B.border : B.blue}`,
              color: followedIds.has(selectedChannel.id) ? B.gray1 : B.white,
              borderRadius: 6, padding: "6px 10px", fontFamily: FONT, fontSize: 11, fontWeight: 700,
              cursor: followBusy ? "wait" : "pointer", width: "100%",
            }}>{followedIds.has(selectedChannel.id) ? "✓ FOLLOWING" : "+ FOLLOW"}</button>
          )}
          {selectedChannel && user && (user.user_id === selectedChannel.created_by || isAdmin) && (
            <button onClick={deleteSelectedChannel} style={{
              marginTop: 12, background: "none", border: `1px solid ${B.red}`, color: B.red, borderRadius: 6,
              padding: "6px 10px", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%",
            }}>DELETE THIS TOPIC</button>
          )}
        </div>

        <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 10 }}>Trending Topics</div>
          {trending === null ? (
            <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT }}>Loading…</div>
          ) : totalTrendingCount < 5 ? (
            <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, lineHeight: 1.5 }}>
              Not enough activity yet to show trends — check back once there are more posts.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trending.map((t, i) => (
                <div key={t.id} onClick={() => { const c = channels.find((ch) => ch.id === t.id); if (c) setSelectedChannel(c); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, color: B.gray1, fontFamily: FONT }}>{i + 1}. {t.name}</span>
                  <span style={{ fontSize: 11, color: B.gray3, fontFamily: FONT }}>{t.count} posts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14 }}>
          <button onClick={() => setRulesOpen((v) => !v)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
            background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: rulesOpen ? 10 : 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>
              {selectedChannel ? `${selectedChannel.name} Rules` : "Topic Rules"}
            </span>
            <span style={{ color: B.gray3 }}><ChevronIcon open={rulesOpen} /></span>
          </button>
          {rulesOpen && (
            !selectedChannel ? (
              <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, lineHeight: 1.5 }}>
                Select a topic to see its rules — each one is set by whoever created it, like a subreddit's own rules.
              </div>
            ) : editingRules ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={rulesDraft} onChange={(e) => setRulesDraft(e.target.value)} rows={5}
                  placeholder={"One rule per line"} style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setEditingRules(false)} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>CANCEL</button>
                  <button disabled={savingRules} onClick={saveRules} style={primaryBtnStyle(!savingRules)}>{savingRules ? "SAVING..." : "SAVE"}</button>
                </div>
              </div>
            ) : (
              <>
                {(selectedChannel.rules || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: B.gray3, fontFamily: FONT, lineHeight: 1.5 }}>No rules set for this topic yet.</div>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedChannel.rules.map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: B.gray2, fontFamily: FONT, lineHeight: 1.4 }}>{r}</li>
                    ))}
                  </ol>
                )}
                {/* Only the topic's own creator can edit its rules — matches
                    the RLS update policy exactly (no admin override here,
                    unlike delete). */}
                {user && user.user_id === selectedChannel.created_by && (
                  <button onClick={startEditRules} style={{
                    marginTop: 10, background: "none", border: `1px solid ${B.border}`, color: B.blue, borderRadius: 6,
                    padding: "6px 10px", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%",
                  }}>EDIT RULES</button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
    </>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <PostTypeTag type={post.post_type} />
            {post.community_channels && (
              <span style={{ fontSize: 11, color: B.blue, fontWeight: 700, fontFamily: FONT }}>{post.community_channels.name}</span>
            )}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: B.gray1, fontFamily: FONT, marginBottom: 6 }}>{post.title}</div>
          <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Avatar name={post.author_name} size={18} />
            <span>u/{post.author_name}</span>
            <span>· {fmtDate(post.created_at)}</span>
            {user && (user.user_id === post.user_id || isAdmin) && (
              <button onClick={removePost} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, padding: 0, marginLeft: "auto" }}>
                DELETE
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: B.gray1, fontFamily: FONT, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{post.body}</div>
          <PostActions post={post} onOpenComments={() => document.getElementById("community-comments")?.scrollIntoView({ behavior: "smooth" })} />
        </div>
      </div>

      {post.portfolio_snapshot && <PortfolioShareCard snapshot={post.portfolio_snapshot} />}

      <div id="community-comments" style={{ marginTop: 16 }}>
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
                    <Avatar name={c.author_name} size={16} />
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

type View = { mode: "feed" } | { mode: "post"; postId: string };

export default function CommunityPage({ holdings }: { holdings?: any[] }) {
  const { user } = useUser();
  const isAdmin = user?.email === OWNER_EMAIL;
  const [view, setView] = useState<View>({ mode: "feed" });
  // undefined = not loaded yet, null = signed in but no username set.
  const [username, setUsernameState] = useState<string | null | undefined>(undefined);
  const [pendingPost, setPendingPost] = usePersistentState<string>("community_pending_post", "");
  // Lifted out of Feed (see its own comment) so switching to a post's
  // detail view and back doesn't lose which topic/channel you were in.
  const [selectedChannel, setSelectedChannel] = useState<CommunityChannel | null>(null);

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
    setView({ mode: "post", postId: pendingPost });
    setPendingPost("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPost]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, padding: 12 }}>
        {view.mode === "feed" && (
          <Feed
            user={user} username={username} isAdmin={isAdmin} holdings={holdings || []}
            onUsernameSet={setUsernameState}
            onOpenPost={(postId) => setView({ mode: "post", postId })}
            selectedChannel={selectedChannel} onSelectChannel={setSelectedChannel}
          />
        )}
        {view.mode === "post" && (
          <PostDetail
            postId={view.postId} user={user} username={username} isAdmin={isAdmin} onUsernameSet={setUsernameState}
            onBack={() => setView({ mode: "feed" })}
          />
        )}
      </div>
    </div>
  );
}
