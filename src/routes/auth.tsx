import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Strategic Markets — Accedi" }] }),
  component: AuthPage,
});

const B = {
  bg: "#000000", panel: "#0A0A0A", panel2: "#111111",
  border: "#2A2A2A", blue: "#0066FF", white: "#FFFFFF",
  yellow: "#FFFF00", gray1: "#CCCCCC", gray2: "#888888", red: "#FF3333",
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e: any) {
      setErr(e.message || "Authentication error");
    } finally { setLoading(false); }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setErr(""); setLoading(true);
    try {
      const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (r.error) throw r.error;
      if (!r.redirected) navigate({ to: "/" });
    } catch (e: any) {
      setErr(e.message || `${provider} error`);
      setLoading(false);
    }
  };

  const fontMono = "'Courier New', Courier, monospace";

  return (
    <div style={{ minHeight: "100vh", background: B.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, fontFamily: fontMono }}>
      <div style={{ width: "100%", maxWidth: 380, background: B.panel, border: `1px solid ${B.border}` }}>
        <div style={{ background: B.blue, padding: "10px 14px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: B.white, letterSpacing: "0.18em" }}>STRATEGIC MARKETS</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
            {mode === "signin" ? "SIGN IN TO TERMINAL" : "CREATE ACCOUNT"}
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => handleOAuth("google")} disabled={loading}
            style={btn(B.white, "#000")}>
            ▶ Continue with Google
          </button>
          <button onClick={() => handleOAuth("apple")} disabled={loading}
            style={btn("#fff", "#000")}>
             Continue with Apple
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: B.border }} />
            <span style={{ fontSize: 9, color: B.gray2, letterSpacing: "0.1em" }}>OR EMAIL</span>
            <div style={{ flex: 1, height: 1, background: B.border }} />
          </div>

          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NAME"
                style={inp} />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              required placeholder="EMAIL" style={inp} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
              required minLength={6} placeholder="PASSWORD (MIN 6)" style={inp} />
            <button type="submit" disabled={loading}
              style={{ ...btn(B.blue, B.white), opacity: loading ? 0.5 : 1 }}>
              {loading ? "..." : mode === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          </form>

          {err && (
            <div style={{ fontSize: 10, color: B.red, padding: "6px 8px",
              background: "#1a0000", border: `1px solid ${B.red}` }}>⚠ {err}</div>
          )}

          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); }}
            style={{ background: "none", border: "none", color: B.gray1, fontSize: 10,
              fontFamily: fontMono, cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>
            {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
          </button>

          <Link to="/" style={{ fontSize: 10, color: B.gray2, textAlign: "center",
            fontFamily: fontMono, textDecoration: "none", marginTop: 4 }}>
            ← Back to terminal
          </Link>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "#000", border: "1px solid #2A2A2A", color: "#FFFF00",
  padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New', monospace",
  outline: "none", letterSpacing: "0.04em",
};
const btn = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, border: "1px solid #2A2A2A", color: fg,
  padding: "10px 12px", fontSize: 12, fontWeight: 700,
  fontFamily: "'Courier New', monospace", letterSpacing: "0.08em",
  cursor: "pointer", textAlign: "center",
});
