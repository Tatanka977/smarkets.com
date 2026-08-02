import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { B } from "@/lib/uiShared";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Strategic Markets — Privacy Policy" },
      { name: "description", content: "How Strategic Markets collects, uses, and protects your personal data — what we store, which services we share it with, and your rights under GDPR." },
    ],
    links: [{ rel: "canonical", href: "https://s-markets.com/privacy" }],
  }),
  component: PrivacyPage,
});

const FONT = "'Courier New', Courier, monospace";

const cardStyle: any = {
  background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12, padding: "16px 18px",
};

function Section({ num, title, children }: any) {
  return (
    <section style={{ ...cardStyle, marginBottom: 12 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: B.blue, fontFamily: FONT,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
      }}>
        {num}. {title}
      </div>
      <div style={{ fontSize: 14, color: B.gray1, lineHeight: 1.7, fontFamily: FONT }}>
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  const [theme, , toggleTheme] = useTheme();
  const isAurora = theme === "aurora";

  return (
    <div style={{ minHeight: "100vh", background: B.bg, color: B.gray1, fontFamily: FONT }}>
      <div style={{ maxWidth: 820, margin: "0 auto", borderLeft: `1px solid ${B.border}`, borderRight: `1px solid ${B.border}`, minHeight: "100vh" }}>
        <div style={{ background: B.blue, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={26} />
            <div>
              <div style={{ fontSize: 16, color: B.white, fontWeight: 700, letterSpacing: "0.14em" }}>STRATEGIC MARKETS</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em" }}>PRIVACY POLICY</div>
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
            <Link to="/" style={{ fontSize: 11, color: B.white, textDecoration: "none", fontWeight: 700, border: `1px solid ${B.white}`, borderRadius: 6, padding: "4px 10px", letterSpacing: "0.06em" }}>
              ← BACK
            </Link>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{
            background: "rgba(255,196,0,0.08)", border: `1px solid ${B.yellow}`, borderRadius: 12,
            padding: "14px 16px", marginBottom: 16, color: B.yellow, fontSize: 13, lineHeight: 1.6, letterSpacing: "0.01em",
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ DRAFT — PENDING LEGAL REVIEW</div>
            <span style={{ color: B.gray1 }}>
              This page is a working draft prepared to describe our current data
              practices in plain terms. It has <b>not</b> been reviewed by qualified
              legal counsel and should not be relied upon as a final, jurisdiction-specific
              Privacy Policy until it has been.
            </span>
          </div>

          <p style={{ fontSize: 13, color: B.gray3, lineHeight: 1.6, marginBottom: 16 }}>
            Last updated: 2026-08-02. This Privacy Policy explains what personal
            data Strategic Markets ("we", "us") collects when you use the
            platform, why, and what rights you have over it.
          </p>

          <Section num="1" title="Who We Are">
            Strategic Markets is an educational portfolio-simulation and market-data
            platform. For any privacy-related question or request, contact us at{" "}
            <a href="mailto:info@s-markets.com" style={{ color: B.blue }}>info@s-markets.com</a>.
            <div style={{ marginTop: 8, fontSize: 12, color: B.gray3 }}>
              [Placeholder — insert registered legal entity name, registered address,
              and VAT/company number here before publishing.]
            </div>
          </Section>

          <Section num="2" title="What We Collect">
            <p style={{ margin: "0 0 10px 0" }}><b>Account data</b>: email address and authentication
              credentials, handled by our authentication provider (Supabase Auth);
              an optional display name, username and bio you set yourself.</p>
            <p style={{ margin: "0 0 10px 0" }}><b>App data you create</b>: simulated portfolio holdings
              and transactions, watchlist entries and price alerts, saved AI
              conversations, community posts/comments, and an optional
              self-reported "investor profile" (age range, goals, risk tolerance,
              etc. — used only to tailor how the AI explains things, see the{" "}
              <Link to="/disclaimer" style={{ color: B.blue }}>Disclaimer</Link>).
              None of this reflects a real brokerage account or real trades.</p>
            <p style={{ margin: 0 }}><b>Local device data</b>: theme preference, whether you've
              acknowledged the regulatory notice, and other UI state, stored in
              your browser's local storage — not sent to us.</p>
          </Section>

          <Section num="3" title="Legal Basis for Processing">
            Where the EU/UK GDPR applies, we process account and app data under{" "}
            <b>performance of a contract</b> (Art. 6(1)(b) — providing the service
            you signed up for) and, for optional fields like the investor
            profile, under <b>consent</b> (Art. 6(1)(a) — you can decline, skip,
            or change these at any time in your profile).
          </Section>

          <Section num="4" title="How We Use Your Data">
            To operate your account and the features you use (portfolio
            simulation, watchlist alerts, community, AI Advisor); to
            personalize which educational content the AI surfaces, based on
            your optional investor profile; to maintain security and prevent
            abuse of the platform. We do not sell personal data, and we do not
            run third-party advertising or analytics trackers on this site.
          </Section>

          <Section num="5" title="Who We Share Data With">
            <p style={{ margin: "0 0 10px 0" }}>We use a small number of
              service providers ("processors") to run the platform:</p>
            <ul style={{ margin: "0 0 10px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Supabase", "authentication, database hosting and storage for your account and app data."],
                ["Groq / Google Gemini", "process the text of your AI Advisor conversations to generate responses. Portfolio figures sent to them are treated as an illustrative dataset, not identified to a real brokerage account."],
                ["Finnhub.io / Yahoo Finance", "public market-data providers for prices/quotes — no personal data is sent to them."],
              ].map(([who, what]) => (
                <li key={who} style={{ paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: B.blue }}>–</span>
                  <b>{who}</b>: {what}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>We do not otherwise sell, rent, or share
              your personal data with third parties for their own marketing
              purposes.</p>
          </Section>

          <Section num="6" title="Data Retention">
            We keep your account and app data for as long as your account is
            active. You can delete individual items (portfolios, watchlist
            entries, saved conversations, posts) from within the app, or
            request full account deletion by contacting us — we'll delete or
            anonymize your personal data within a reasonable time, except
            where we're required to retain it by law.
          </Section>

          <Section num="7" title="Cookies & Local Storage">
            We do not use third-party advertising or analytics cookies. The
            app stores functional data in your browser's local storage
            (theme choice, whether you've seen the regulatory notice, and
            similar UI state) and uses your authentication session token to
            keep you signed in. Disabling local storage will break core
            functionality of the app.
          </Section>

          <Section num="8" title="International Transfers">
            Our service providers may process data outside your country of
            residence, including in the United States. Where this involves a
            transfer of personal data out of the EU/UK, our providers rely on
            appropriate safeguards (such as Standard Contractual Clauses)
            under their own terms.
          </Section>

          <Section num="9" title="Your Rights">
            <p style={{ margin: "0 0 10px 0" }}>Depending on your jurisdiction
              (including under the EU/UK GDPR), you may have the right to:</p>
            <ul style={{ margin: "0 0 10px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                "access the personal data we hold about you;",
                "request correction of inaccurate data;",
                "request erasure of your data (\"right to be forgotten\");",
                "restrict or object to certain processing;",
                "receive your data in a portable format;",
                "lodge a complaint with your local data protection authority.",
              ].map((item) => (
                <li key={item} style={{ paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: B.blue }}>–</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>To exercise any of these rights, contact
              us at <a href="mailto:info@s-markets.com" style={{ color: B.blue }}>info@s-markets.com</a>.</p>
          </Section>

          <Section num="10" title="Security">
            We rely on our infrastructure providers' security controls
            (encryption in transit, access controls, row-level security on
            our database) to protect your data, but no method of transmission
            or storage is 100% secure and we can't guarantee absolute
            security.
          </Section>

          <Section num="11" title="Children">
            Strategic Markets is not directed at, and should not be used by,
            anyone under the age of 18.
          </Section>

          <Section num="12" title="Changes to This Policy">
            We may update this policy from time to time. Material changes
            will be reflected by updating the "Last updated" date above.
          </Section>

          <div style={{
            background: B.panel, border: `1px solid ${B.blue}`, borderRadius: 12,
            padding: "14px 16px", color: B.gray2, fontSize: 12, lineHeight: 1.7, marginBottom: 16,
          }}>
            <div style={{ color: B.blue, fontWeight: 700, marginBottom: 6, fontSize: 12, letterSpacing: "0.08em" }}>
              RELATED
            </div>
            See also the <Link to="/disclaimer" style={{ color: B.blue }}>Regulatory Notice &amp; Disclaimer</Link>{" "}
            for the terms governing the educational, non-advice nature of this
            platform, and the <Link to="/terms" style={{ color: B.blue }}>Terms of Service</Link>{" "}
            for the terms governing your use of the platform itself.
          </div>

          <div style={{ textAlign: "center" }}>
            <Link to="/" style={{
              display: "inline-block", background: B.blue, color: B.white, borderRadius: 6,
              padding: "10px 22px", textDecoration: "none", fontSize: 13,
              fontWeight: 700, letterSpacing: "0.08em",
            }}>
              ← BACK TO HOME
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
