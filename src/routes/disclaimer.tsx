import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { B } from "@/lib/uiShared";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({ meta: [{ title: "Strategic Markets — Regulatory Notice" }] }),
  component: DisclaimerPage,
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

function DisclaimerPage() {
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em" }}>REGULATORY NOTICE — TERMS &amp; DISCLAIMER</div>
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
            <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ IMPORTANT NOTICE — PLEASE READ CAREFULLY</div>
            <span style={{ color: B.gray1 }}>
              Strategic Markets is an educational and informational analytics terminal. The content does
              not constitute, and must not be interpreted as, financial advice,
              an investment recommendation, a solicitation, an offer or an
              invitation to buy or sell financial instruments under{" "}
              <b>Directive 2014/65/EU (MiFID II)</b>, <b>EU Regulation 2017/565</b>,
              the <b>Securities Act of 1933</b>, the{" "}
              <b>Securities Exchange Act of 1934</b>, the UK Financial Services and
              Markets Act 2000, or any other applicable law.
            </span>
          </div>

          <Section num="1" title="Nature of the Service">
            Strategic Markets is a <b>financial education</b> platform offering portfolio
            simulation and market data visualization. The prices and metrics
            shown are sourced from third-party providers (Finnhub, Yahoo Finance,
            public market feeds) and may be delayed, mocked, or inaccurate. The
            integrated AI produces quantitative observations and hypothetical
            scenarios for educational purposes only.
          </Section>

          <Section num="2" title="No Financial Advice">
            <p style={{ margin: "0 0 10px 0" }}>
              Strategic Markets is <b>not a licensed financial advisor</b>, is not registered
              with the OCF, CONSOB, SEC, FCA, BaFin, FINMA or any other
              supervisory authority, and is not authorized to provide:
            </p>
            <ul style={{ margin: "0 0 10px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                "investment advice (within the meaning of MiFID II Art. 4(1)(4));",
                "portfolio management services;",
                "reception or transmission of orders;",
                "placement or public solicitation of savings.",
              ].map((item) => (
                <li key={item} style={{ paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: B.blue }}>–</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>
              All numerical indications, statistical analyses, allocation
              scenarios and AI responses are <b>for educational and informational
              purposes only</b>. Phrases such as "buy", "sell", "invest", if
              present in AI outputs, are part of educational examples or news
              citations and <b>do not</b> constitute personalized
              recommendations.
            </p>
          </Section>

          <Section num="3" title="Investment Risks">
            Financial instruments (equities, ETFs, bonds, derivatives, crypto
            assets, currencies) carry <b>significant risks</b>, including the
            possible total loss of invested capital. Past performance is{" "}
            <b>not indicative</b> of future results. Volatility, illiquidity,
            issuer risk, currency risk, country risk and regulatory risk can
            materially affect returns.
          </Section>

          <Section num="4" title="Limitation of Liability">
            To the maximum extent permitted by applicable law, Strategic Markets, its
            developers, data providers and affiliates disclaim all liability
            for direct, indirect, incidental, consequential or punitive damages
            arising from the use of or inability to use the platform, including
            (without limitation) financial losses, lost opportunities,
            reputational damage or service interruptions.
          </Section>

          <Section num="5" title="Data and Cookies">
            Market data is provided by Finnhub.io, Yahoo Finance and other public
            sources and may be delayed or inaccurate. User sessions and
            portfolio settings are stored on Supabase (EU/US-hosted). For
            details on personal data processing please refer to the{" "}
            <Link to="/privacy" style={{ color: B.blue }}>Privacy Policy</Link>.
          </Section>

          <Section num="6" title="Generative AI">
            AI responses are produced by large language models and may contain
            errors, hallucinations or out-of-date information. Do not rely on
            AI responses for real financial decisions. Always verify with
            official sources and consult a licensed professional before making
            any investment decision.
          </Section>

          <Section num="7" title="Consult a Licensed Professional">
            For personalized advice on investments, taxation or financial
            planning please consult a <b>licensed financial advisor</b>
            (registered with the OCF in Italy, FINRA/SEC in the US, FCA in the
            UK, or the equivalent body in your jurisdiction), a chartered
            accountant or a qualified attorney.
          </Section>

          <Section num="8" title="Governing Law">
            This notice is governed by Italian law. Any dispute shall fall
            under the exclusive jurisdiction of the consumer forum where
            applicable, or the Court of Milan on a residual basis.
          </Section>

          <div style={{
            background: B.panel, border: `1px solid ${B.border}`, borderRadius: 12,
            padding: "14px 16px", color: B.gray2, fontSize: 12, lineHeight: 1.7, marginBottom: 12,
          }}>
            <div style={{ color: B.blue, fontWeight: 700, marginBottom: 6, fontSize: 12, letterSpacing: "0.08em" }}>
              RELATED
            </div>
            See also the <Link to="/privacy" style={{ color: B.blue }}>Privacy Policy</Link>{" "}
            for how we handle your personal data, and the{" "}
            <Link to="/terms" style={{ color: B.blue }}>Terms of Service</Link>{" "}
            for the terms governing your use of the platform itself.
          </div>

          <div style={{
            background: B.panel, border: `1px solid ${B.blue}`, borderRadius: 12,
            padding: "14px 16px", color: B.gray2, fontSize: 12, lineHeight: 1.7, marginBottom: 16,
          }}>
            <div style={{ color: B.blue, fontWeight: 700, marginBottom: 6, fontSize: 12, letterSpacing: "0.08em" }}>
              BOTTOM LINE
            </div>
            The information provided by Strategic Markets is for <b>educational and
            informational purposes only</b> and does not constitute investment
            advice, a recommendation, or a solicitation to buy or sell any
            financial instrument. Past performance is not indicative of future
            results. Please consult a licensed financial advisor before making
            any investment decision.
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
