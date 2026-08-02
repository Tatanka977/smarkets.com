import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { B } from "@/lib/uiShared";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Strategic Markets — Terms of Service" },
      { name: "description", content: "The terms governing your use of Strategic Markets — account rules, acceptable use, and how the platform's educational content and AI assistant may be used." },
    ],
    links: [{ rel: "canonical", href: "https://s-markets.com/terms" }],
  }),
  component: TermsPage,
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

function TermsPage() {
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em" }}>TERMS OF SERVICE</div>
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
              This page is a working draft of the terms governing use of the
              platform. It has <b>not</b> been reviewed by qualified legal
              counsel and should not be relied upon as final, jurisdiction-specific
              Terms of Service until it has been.
            </span>
          </div>

          <p style={{ fontSize: 13, color: B.gray3, lineHeight: 1.6, marginBottom: 16 }}>
            Last updated: 2026-08-02. These Terms of Service ("Terms") govern
            your access to and use of Strategic Markets ("the Service", "we",
            "us"). By creating an account or using the Service, you agree to
            these Terms and to the{" "}
            <Link to="/disclaimer" style={{ color: B.blue }}>Regulatory Notice &amp; Disclaimer</Link>{" "}
            and <Link to="/privacy" style={{ color: B.blue }}>Privacy Policy</Link>, which are
            incorporated here by reference.
          </p>

          <Section num="1" title="The Service">
            Strategic Markets is an <b>educational</b> portfolio-simulation
            and market-analytics terminal. It does not execute real trades,
            hold real securities, or move real money — all portfolios,
            positions and transactions in the app are simulated for learning
            purposes. See the{" "}
            <Link to="/disclaimer" style={{ color: B.blue }}>Disclaimer</Link>{" "}
            for the full regulatory notice, including that nothing in the
            Service constitutes investment advice.
          </Section>

          <Section num="2" title="Eligibility & Accounts">
            You must be at least 18 years old to use the Service. You're
            responsible for maintaining the confidentiality of your account
            credentials and for all activity under your account. Provide
            accurate information when creating an account and keep it up to
            date.
          </Section>

          <Section num="3" title="Acceptable Use">
            <p style={{ margin: "0 0 10px 0" }}>You agree not to:</p>
            <ul style={{ margin: "0 0 10px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                "use the Service for any unlawful purpose, or in a way that violates applicable securities or financial-services regulations;",
                "attempt to circumvent the Service's rate limits, authentication, or the AI system's compliance safeguards;",
                "post content in the Community that is defamatory, harassing, fraudulent, or that solicits real securities transactions;",
                "misrepresent Strategic Markets, its data, or its AI outputs as licensed financial advice to any third party;",
                "scrape, reverse-engineer, or resell the Service's market data or AI outputs in bulk.",
              ].map((item) => (
                <li key={item} style={{ paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: B.blue }}>–</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>We may suspend or terminate accounts that
              violate this section.</p>
          </Section>

          <Section num="4" title="Your Content">
            You retain ownership of the content you post (community posts,
            comments, profile bio). By posting, you grant us a license to
            display it within the Service as intended (e.g. showing your
            community posts to other users). You're responsible for content
            you post and confirm you have the right to post it.
          </Section>

          <Section num="5" title="AI-Generated Content">
            The Service's AI Advisor produces educational, quantitative
            observations — not personalized advice, and not guaranteed to be
            accurate, complete, or current. See{" "}
            <Link to="/disclaimer" style={{ color: B.blue }}>Section 6 of the Disclaimer</Link>{" "}
            for the full notice on generative AI limitations.
          </Section>

          <Section num="6" title="Market Data">
            Prices, quotes and other market data are sourced from third-party
            providers (Finnhub.io, Yahoo Finance, and similar public feeds)
            and may be delayed, incomplete, or inaccurate. We don't guarantee
            the accuracy or timeliness of any data shown in the Service.
          </Section>

          <Section num="7" title="Intellectual Property">
            The Service's software, design, and branding are owned by us or
            our licensors and are protected by applicable intellectual
            property laws. These Terms don't grant you any rights to our
            trademarks or branding beyond what's needed to use the Service
            normally.
          </Section>

          <Section num="8" title="Termination">
            You may stop using the Service and request account deletion at
            any time by contacting us. We may suspend or terminate your
            access if you violate these Terms, or discontinue the Service (in
            whole or in part) at our discretion, with reasonable notice where
            practicable.
          </Section>

          <Section num="9" title="Disclaimer of Warranties">
            The Service is provided "as is" and "as available," without
            warranties of any kind, express or implied, including
            merchantability, fitness for a particular purpose, or
            non-infringement. We don't warrant that the Service will be
            uninterrupted, error-free, or that its data/AI outputs will be
            accurate.
          </Section>

          <Section num="10" title="Limitation of Liability">
            To the maximum extent permitted by applicable law, our liability
            for any claim arising from your use of the Service is limited as
            described in{" "}
            <Link to="/disclaimer" style={{ color: B.blue }}>Section 4 of the Disclaimer</Link>.
          </Section>

          <Section num="11" title="Changes to These Terms">
            We may update these Terms from time to time. Material changes
            will be reflected by updating the "Last updated" date above;
            continued use of the Service after a change constitutes
            acceptance of the updated Terms.
          </Section>

          <Section num="12" title="Governing Law">
            These Terms are governed by Italian law, consistent with{" "}
            <Link to="/disclaimer" style={{ color: B.blue }}>Section 8 of the Disclaimer</Link>.
          </Section>

          <div style={{
            background: B.panel, border: `1px solid ${B.blue}`, borderRadius: 12,
            padding: "14px 16px", color: B.gray2, fontSize: 12, lineHeight: 1.7, marginBottom: 16,
          }}>
            <div style={{ color: B.blue, fontWeight: 700, marginBottom: 6, fontSize: 12, letterSpacing: "0.08em" }}>
              QUESTIONS
            </div>
            Contact us at <a href="mailto:info@s-markets.com" style={{ color: B.blue }}>info@s-markets.com</a>{" "}
            with any questions about these Terms.
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
