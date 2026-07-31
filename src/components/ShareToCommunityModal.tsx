import { useState, useEffect, useMemo } from "react";
import { B } from "@/lib/uiShared";
import { usePersistentState } from "@/hooks/usePersistentState";
import { createCommunityPost, listChannels } from "@/lib/community.functions";
import type { CommunityChannel } from "@/lib/community.functions";
import { buildSnapshotFromHoldings, PortfolioBadge } from "./CommunityPage";

const FONT = "'Courier New', Courier, monospace";

const inputStyle: any = {
  background: B.panel2, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
  padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none",
};
const labelStyle: any = { fontSize: 10, color: B.gray3, letterSpacing: "0.08em", fontFamily: FONT, marginBottom: 4 };

// The single "share my portfolio to the community" form, reused everywhere
// a Share to Community entry point exists (Portfolio page, Analysis Risk
// tab, the post-save prompt, the AI Advisor's contextual suggestion) —
// one implementation, not copies. Always attaches the user's current live
// portfolio via buildSnapshotFromHoldings (same function the Community
// page's own "attach a portfolio" picker uses), and always uses the
// existing createCommunityPost — no separate insert path, no separate
// notification system.
export default function ShareToCommunityModal({
  holdings, defaultChannelId, defaultTitle, defaultBody, setPage, onClose, onShared,
}: {
  holdings: any[];
  defaultChannelId?: string | null;
  defaultTitle?: string;
  defaultBody?: string;
  setPage: (p: string) => void;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [body, setBody] = useState(defaultBody || "");
  const [channelId, setChannelId] = useState(defaultChannelId || "");
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [, setPendingPost] = usePersistentState<string>("community_pending_post", "");

  useEffect(() => {
    listChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  const snapshot = useMemo(() => buildSnapshotFromHoldings(holdings || [], "Current portfolio"), [holdings]);

  const submit = async () => {
    if (!title.trim() || !body.trim() || posting) return;
    setPosting(true); setError("");
    try {
      const post = await createCommunityPost({
        data: {
          title: title.trim(), body: body.trim(),
          channelId: channelId || null,
          portfolioSnapshot: snapshot,
        },
      });
      // Direct write, not just the usePersistentState setter (which only
      // persists via a useEffect) — setPage below unmounts this component
      // in the same render batch, before that effect would get a chance
      // to run. Same fix already used elsewhere for this exact handoff.
      try { localStorage.setItem("moneta_community_pending_post", JSON.stringify(post.id)); } catch {}
      setPendingPost(post.id);
      onShared?.();
      setPage("community");
      onClose();
    } catch (e: any) {
      setError(e.message || "Error publishing post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: 16,
        width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10,
        maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: B.gray1, fontFamily: FONT }}>SHARE TO COMMUNITY</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        <div>
          <div style={labelStyle}>TITLE</div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Thoughts on my portfolio?" maxLength={200}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div>
          <div style={labelStyle}>WHAT'S ON YOUR MIND</div>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Write something..." rows={4} maxLength={8000}
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </div>

        <div>
          <div style={labelStyle}>TOPIC (OPTIONAL)</div>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            <option value="">No specific channel</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {snapshot && (
          <div>
            <div style={labelStyle}>ATTACHED PORTFOLIO</div>
            <PortfolioBadge snapshot={snapshot} />
          </div>
        )}

        {error && <div style={{ fontSize: 11, color: B.red, fontFamily: FONT }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: B.gray3, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 700 }}>
            CANCEL
          </button>
          <button
            onClick={submit} disabled={!title.trim() || !body.trim() || posting}
            style={{
              background: (!title.trim() || !body.trim() || posting) ? B.panel2 : B.blue,
              color: (!title.trim() || !body.trim() || posting) ? B.gray3 : B.white,
              border: "none", padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700,
              cursor: (!title.trim() || !body.trim() || posting) ? "not-allowed" : "pointer",
            }}
          >
            {posting ? "POSTING..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
