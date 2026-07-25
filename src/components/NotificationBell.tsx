import { useState, useEffect, useCallback, useRef } from "react";
import { B } from "@/lib/uiShared";
import { useUser } from "@/hooks/useUser";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  listNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead,
} from "@/lib/notifications.functions";
import type { AppNotification } from "@/lib/notifications.functions";

const FONT = "'Courier New', Courier, monospace";

function fmtAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Lives in PortfolioTerminal's TopBar. Community activity (new comment on
// your post) and price alerts both land in the same `notifications` table
// server-side/via refreshPrices — this just renders and lets the user
// jump to the relevant page. Cross-sibling-component handoff (this sits
// next to, not above, CommunityPage in the tree) reuses the same
// localStorage-pending-value pattern already used for ai_pending_prompt.
export default function NotificationBell({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setPendingPost] = usePersistentState<string>("community_pending_post", "");
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try { setUnread(await getUnreadNotificationCount()); } catch {}
  }, [user]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [user, refreshCount]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    listNotifications().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      setItems((its) => its.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
      try { await markNotificationRead({ data: { id: n.id } }); } catch {}
    }
    setOpen(false);
    if (n.link_type === "post" && n.link_id) {
      setPendingPost(n.link_id);
      setPage("community");
    } else if (n.link_type === "symbol") {
      setPage("search");
    }
  };

  const markAllRead = async () => {
    setItems((its) => its.map((i) => ({ ...i, read: true })));
    setUnread(0);
    try { await markAllNotificationsRead(); } catch {}
  };

  if (!user) return null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
        style={{
          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "50%", width: 28, height: 28, cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3, background: B.red, color: "#fff",
            fontSize: 9, fontWeight: 700, fontFamily: FONT, borderRadius: 8,
            minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxWidth: "90vw",
          background: B.panel, border: `1px solid ${B.border}`, borderRadius: 10, zIndex: 1000,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)", overflow: "hidden",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${B.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: B.gray1, letterSpacing: "0.06em", fontFamily: FONT }}>NOTIFICATIONS</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: B.blue, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                MARK ALL READ
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: B.gray3, fontSize: 12, fontFamily: FONT }}>LOADING...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: B.gray3, fontSize: 12, fontFamily: FONT }}>No notifications yet.</div>
            ) : (
              items.map((n) => (
                <div key={n.id} onClick={() => openNotification(n)} style={{
                  padding: "10px 12px", borderBottom: `1px solid ${B.border}`, cursor: "pointer",
                  background: n.read ? "transparent" : B.panel2,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: n.read ? B.gray2 : B.gray1, fontFamily: FONT }}>{n.title}</span>
                    <span style={{ fontSize: 10, color: B.gray3, fontFamily: FONT, flexShrink: 0 }}>{fmtAgo(n.created_at)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 11, color: B.gray3, fontFamily: FONT, marginTop: 2 }}>{n.body}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
