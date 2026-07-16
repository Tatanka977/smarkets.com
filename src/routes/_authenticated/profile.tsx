import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfile, updateProfile,
  listPortfolios, deletePortfolio,
  listWatchlist, removeFromWatchlist,
  listConversations, deleteConversation,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Strategic Markets — My profile" }] }),
  component: ProfilePage,
});

const B = {
  bg: "#000", panel: "#0A0A0A", panel2: "#111", border: "#2A2A2A",
  blue: "#0066FF", white: "#fff", yellow: "#FFFF00", gray1: "#CCC", gray2: "#888", red: "#FF3333",
};
const FONT = "'Courier New', Courier, monospace";

function ProfilePage() {
  const navigate = useNavigate();
  const fGet = useServerFn(getProfile);
  const fUpd = useServerFn(updateProfile);
  const fPorts = useServerFn(listPortfolios);
  const fDelP = useServerFn(deletePortfolio);
  const fWatch = useServerFn(listWatchlist);
  const fDelW = useServerFn(removeFromWatchlist);
  const fConv = useServerFn(listConversations);
  const fDelC = useServerFn(deleteConversation);

  const [tab, setTab] = useState<"profile" | "portfolios" | "watchlist" | "ai">("profile");
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [ports, setPorts] = useState<any[]>([]);
  const [watch, setWatch] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const loadAll = async () => {
    const [p, po, w, c] = await Promise.all([fGet(), fPorts(), fWatch(), fConv()]);
    setProfile(p); setName(p?.display_name || "");
    setPorts(po); setWatch(w); setConvs(c);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setMsg("");
    await fUpd({ data: { display_name: name } });
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1500);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: B.bg, fontFamily: FONT, color: B.gray1 }}>
      <div style={{ background: B.blue, padding: "8px 14px", display: "flex",
        justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: B.white, letterSpacing: "0.18em" }}>STRATEGIC MARKETS</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)" }}>USER PROFILE</div>
        </div>
        <Link to="/" style={{ fontSize: 11, color: B.white, textDecoration: "none", fontWeight: 700 }}>
          ← TERMINAL
        </Link>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${B.border}`, background: B.panel2 }}>
        {[
          { id: "profile", l: "PROFILE" },
          { id: "portfolios", l: `PORTFOLIOS (${ports.length})` },
          { id: "watchlist", l: `WATCHLIST (${watch.length})` },
          { id: "ai", l: `AI CHAT (${convs.length})` },
        ].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: tab === t.id ? B.blue : "transparent",
            border: "none", color: tab === t.id ? B.white : B.gray2,
            padding: "10px 4px", fontFamily: FONT, fontSize: 10, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.06em",
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding: 14, maxWidth: 640, margin: "0 auto" }}>
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="EMAIL" value={email} readOnly />
            <div>
              <div style={{ fontSize: 9, color: B.gray2, marginBottom: 4, letterSpacing: "0.08em" }}>DISPLAY NAME</div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
            </div>
            <button onClick={save} style={btn(B.blue, B.white)}>SAVE</button>
            {msg && <div style={{ fontSize: 10, color: B.yellow }}>✓ {msg}</div>}
            <button onClick={logout} style={{ ...btn("transparent", B.red), borderColor: B.red, marginTop: 16 }}>
              SIGN OUT
            </button>
          </div>
        )}

        {tab === "portfolios" && (
          <List
            items={ports}
            empty="No portfolios saved. Build one in the terminal and press SAVE."
            render={(p) => (
              <>
                <div style={{ fontSize: 12, color: B.yellow, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 9, color: B.gray2 }}>
                  {(p.holdings as any[]).length} holdings · {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </>
            )}
            onDel={async (id) => { await fDelP({ data: { id } }); loadAll(); }}
          />
        )}

        {tab === "watchlist" && (
          <List
            items={watch}
            empty="No tickers in your watchlist."
            render={(w) => (
              <>
                <div style={{ fontSize: 12, color: B.yellow, fontWeight: 700 }}>{w.symbol}</div>
                <div style={{ fontSize: 9, color: B.gray2 }}>{w.name || ""} · {w.category || ""}</div>
              </>
            )}
            onDel={async (id) => { await fDelW({ data: { id } }); loadAll(); }}
          />
        )}

        {tab === "ai" && (
          <List
            items={convs}
            empty="No saved conversations."
            render={(c) => (
              <>
                <div style={{ fontSize: 12, color: B.yellow, fontWeight: 700 }}>{c.title}</div>
                <div style={{ fontSize: 9, color: B.gray2 }}>
                  {(c.messages as any[]).length} messages · {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </>
            )}
            onDel={async (id) => { await fDelC({ data: { id } }); loadAll(); }}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, readOnly }: any) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#888", marginBottom: 4, letterSpacing: "0.08em" }}>{label}</div>
      <input value={value} readOnly={readOnly} style={{ ...inp, opacity: readOnly ? 0.6 : 1 }} />
    </div>
  );
}

function List(props: {
  items: any[];
  empty: string;
  render: (it: any) => React.ReactNode;
  onDel: (id: string) => void;
}) {
  const { items, empty, render, onDel } = props;
  if (!items.length) return <div style={{ fontSize: 11, color: B.gray2, padding: 16, textAlign: "center" }}>{empty}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it: any) => (
        <div key={it.id} style={{ border: `1px solid ${B.border}`, padding: 10, background: B.panel,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{render(it)}</div>
          <button onClick={() => onDel(it.id)} style={{
            background: "transparent", border: `1px solid ${B.red}`, color: B.red,
            padding: "4px 10px", fontFamily: FONT, fontSize: 10, cursor: "pointer",
          }}>✕</button>
        </div>
      ))}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", background: "#000", border: "1px solid #2A2A2A", color: "#FFFF00",
  padding: "10px 12px", fontSize: 13, fontFamily: FONT, outline: "none",
};
const btn = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, border: `1px solid ${bg}`, color: fg,
  padding: "10px 12px", fontSize: 12, fontWeight: 700,
  fontFamily: FONT, letterSpacing: "0.08em", cursor: "pointer",
});
