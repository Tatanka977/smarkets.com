import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { B } from "@/lib/uiShared";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Strategic Markets — Sign In" }] }),
  component: AuthPage,
});

function AuthPage() {
  useTheme(); // ensures data-theme is set on <html>, even if this is the first page visited
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const fontMono = "'Courier New', Courier, monospace";

  const handleGoogle = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/terminal" },
    });
    if (error) setErr(error.message);
  };

  const handleApple = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin + "/terminal" },
    });
    if (error) setErr(error.message);
  };

  const handleEmail = async (e: any) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split("@")[0] } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/terminal" });
    } catch (e: any) {
      setErr(e.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: B.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, fontFamily: fontMono }}>
      <div style={{ width: "100%", maxWidth: 380, background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: B.blue, padding: "14px 16px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.14em" }}>STRATEGIC MARKETS</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            {mode === "signin" ? "SIGN IN TO TERMINAL" : "CREATE ACCOUNT"}
          </div>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <button data-testid="google-signin-btn" onClick={handleGoogle} disabled={loading} style={{
            background: B.panel2, color: B.gray1, border: `1px solid ${B.border}`, padding: "10px 12px", borderRadius: 8,
            fontWeight: 700, cursor: "pointer", fontFamily: fontMono, fontSize: 13, letterSpacing: "0.02em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C33.6 5.1 29 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C33.6 5.1 29 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5.1l-6-4.9C29 36.9 26.6 38 24 38c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 40.6 16.2 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6 4.9C40.9 35.6 44 30.2 44 24c0-1.4-.1-2.7-.4-3.5z"/>
            </svg>
            Continue with Google
          </button>

          <button data-testid="apple-signin-btn" onClick={handleApple} disabled={loading} style={{
            background: B.panel2, color: B.gray1, border: `1px solid ${B.border}`, padding: "10px 12px", borderRadius: 8,
            fontWeight: 700, cursor: "pointer", fontFamily: fontMono, fontSize: 13, letterSpacing: "0.02em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: B.border }} />
            <span style={{ fontSize: 9, color: B.gray2, letterSpacing: "0.14em" }}>OR EMAIL</span>
            <div style={{ flex: 1, height: 1, background: B.border }} />
          </div>

          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mode === "signup" && (
              <input data-testid="auth-name-input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="NAME" required minLength={1}
                style={{ background: B.bg, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
                  padding: "8px 10px", fontSize: 12, fontFamily: fontMono, outline: "none", letterSpacing: "0.04em", textTransform: "uppercase" }} />
            )}
            <input data-testid="auth-email-input" value={email} onChange={(e) => setEmail(e.target.value)}
              type="email" required placeholder="EMAIL"
              style={{ background: B.bg, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
                padding: "8px 10px", fontSize: 12, fontFamily: fontMono, outline: "none", letterSpacing: "0.04em", textTransform: "uppercase" }} />
            <input data-testid="auth-password-input" value={password} onChange={(e) => setPassword(e.target.value)}
              type="password" required minLength={6} placeholder="PASSWORD (MIN 6)"
              style={{ background: B.bg, border: `1px solid ${B.border}`, color: B.gray1, borderRadius: 6,
                padding: "8px 10px", fontSize: 12, fontFamily: fontMono, outline: "none", letterSpacing: "0.04em", textTransform: "uppercase" }} />
            <button data-testid="auth-submit-btn" type="submit" disabled={loading} style={{
              background: B.blue, color: "#FFFFFF", border: "none", padding: "10px 12px", borderRadius: 8,
              fontWeight: 700, cursor: loading ? "wait" : "pointer",
              fontFamily: fontMono, fontSize: 13, letterSpacing: "0.1em", opacity: loading ? 0.6 : 1,
            }}>
              {loading ? "..." : mode === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          </form>

          {err && (
            <div style={{ fontSize: 11, color: B.red, padding: "6px 8px", borderRadius: 6,
              background: B.panel2, border: `1px solid ${B.red}` }}>⚠ {err}</div>
          )}

          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); }}
            style={{ background: "none", border: "none", color: B.gray1, fontSize: 11,
              fontFamily: fontMono, cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>
            {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
          </button>

          <Link to="/" style={{ fontSize: 10, color: B.gray2, textAlign: "center",
            fontFamily: fontMono, textDecoration: "none", marginTop: 4 }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
