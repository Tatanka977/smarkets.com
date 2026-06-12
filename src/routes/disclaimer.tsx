import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({ meta: [{ title: "Moneta — Regulatory Notice" }] }),
  component: DisclaimerPage,
});

const B = {
  bg: "#000000", panel: "#0A0A0A", panel2: "#111111",
  border: "#2A2A2A", blue: "#0066FF", white: "#FFFFFF",
  yellow: "#FFFF00", cyan: "#00FFFF", gray1: "#CCCCCC", gray2: "#888888",
};

function Section({ title, children }: any) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{
        fontSize: 18, color: B.yellow, fontFamily: "'Courier New',monospace",
        fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px 0",
        borderBottom: `1px solid ${B.blue}`, paddingBottom: 4,
      }}>
        ▸ {title}
      </h2>
      <div style={{ fontSize: 14, color: B.gray1, lineHeight: 1.65, fontFamily: "'Courier New',monospace" }}>
        {children}
      </div>
    </section>
  );
}

function DisclaimerPage() {
  return (
    <div style={{
      minHeight: "100vh", background: B.bg, color: B.gray1,
      fontFamily: "'Courier New',Courier,monospace", padding: "20px",
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{
          background: B.blue, padding: "10px 14px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 22, color: B.white, fontWeight: 700, letterSpacing: "0.16em" }}>
              MONETA
            </div>
            <div style={{ fontSize: 12, color: B.white, letterSpacing: "0.1em", opacity: 0.85 }}>
              REGULATORY NOTICE — TERMS &amp; DISCLAIMER
            </div>
          </div>
          <Link to="/" style={{
            color: B.white, textDecoration: "none", fontSize: 14, fontWeight: 700,
            border: `1px solid ${B.white}`, padding: "4px 10px", letterSpacing: "0.08em",
          }}>
            ← BACK TO TERMINAL
          </Link>
        </div>

        <div style={{
          background: "#1a0f00", border: `1px solid ${B.yellow}`,
          padding: "10px 14px", margin: "14px 0", color: B.yellow,
          fontSize: 14, lineHeight: 1.5, letterSpacing: "0.02em",
        }}>
          ⚠ <b>IMPORTANT NOTICE — PLEASE READ CAREFULLY.</b> Moneta is an
          educational and informational analytics terminal. The content does
          not constitute, and must not be interpreted as, financial advice,
          an investment recommendation, a solicitation, an offer or an
          invitation to buy or sell financial instruments under{" "}
          <b>Directive 2014/65/EU (MiFID II)</b>, <b>EU Regulation 2017/565</b>,
          the <b>Securities Act of 1933</b>, the{" "}
          <b>Securities Exchange Act of 1934</b>, the UK Financial Services and
          Markets Act 2000, or any other applicable law.
        </div>

        <Section title="1. Nature of the Service">
          Moneta is a <b>financial education</b> platform offering portfolio
          simulation and market data visualization. The prices and metrics
          shown are sourced from third-party providers (Finnhub, public market
          feeds) and may be delayed, mocked, or inaccurate. The integrated AI
          produces quantitative observations and hypothetical scenarios for
          educational purposes only.
        </Section>

        <Section title="2. No Financial Advice">
          <p style={{ margin: "0 0 8px 0" }}>
            Moneta is <b>not a licensed financial advisor</b>, is not registered
            with the OCF, CONSOB, SEC, FCA, BaFin, FINMA or any other
            supervisory authority, and is not authorized to provide:
          </p>
          <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>
            <li>investment advice (within the meaning of MiFID II Art. 4(1)(4));</li>
            <li>portfolio management services;</li>
            <li>reception or transmission of orders;</li>
            <li>placement or public solicitation of savings.</li>
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

        <Section title="3. Investment Risks">
          Financial instruments (equities, ETFs, bonds, derivatives, crypto
          assets, currencies) carry <b>significant risks</b>, including the
          possible total loss of invested capital. Past performance is{" "}
          <b>not indicative</b> of future results. Volatility, illiquidity,
          issuer risk, currency risk, country risk and regulatory risk can
          materially affect returns.
        </Section>

        <Section title="4. Limitation of Liability">
          To the maximum extent permitted by applicable law, Moneta, its
          developers, data providers and affiliates disclaim all liability
          for direct, indirect, incidental, consequential or punitive damages
          arising from the use of or inability to use the platform, including
          (without limitation) financial losses, lost opportunities,
          reputational damage or service interruptions.
        </Section>

        <Section title="5. Data and Cookies">
          Market data is provided by Finnhub.io and other public sources and
          may be delayed or inaccurate. User sessions and portfolio settings
          are stored on Supabase (EU/US-hosted). For details on personal data
          processing please refer to the Privacy Policy (in preparation).
        </Section>

        <Section title="6. Generative AI">
          AI responses are produced by large language models (Gemini 2.5
          Flash) and may contain errors, hallucinations or out-of-date
          information. Do not rely on AI responses for real financial
          decisions. Always verify with official sources and consult a
          licensed professional before making any investment decision.
        </Section>

        <Section title="7. Consult a Licensed Professional">
          For personalized advice on investments, taxation or financial
          planning please consult a <b>licensed financial advisor</b>
          (registered with the OCF in Italy, FINRA/SEC in the US, FCA in the
          UK, or the equivalent body in your jurisdiction), a chartered
          accountant or a qualified attorney.
        </Section>

        <Section title="8. Governing Law">
          This notice is governed by Italian law. Any dispute shall fall
          under the exclusive jurisdiction of the consumer forum where
          applicable, or the Court of Milan on a residual basis.
        </Section>

        <div style={{
          marginTop: 30, padding: "12px 14px", borderTop: `2px solid ${B.blue}`,
          color: B.gray2, fontSize: 12, lineHeight: 1.6,
        }}>
          <div style={{ color: B.yellow, fontWeight: 700, marginBottom: 6 }}>
            BOTTOM LINE
          </div>
          The information provided by Moneta is for <b>educational and
          informational purposes only</b> and does not constitute investment
          advice, a recommendation, or a solicitation to buy or sell any
          financial instrument. Past performance is not indicative of future
          results. Please consult a licensed financial advisor before making
          any investment decision.
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{
            display: "inline-block", background: B.blue, color: B.white,
            padding: "8px 20px", textDecoration: "none", fontSize: 14,
            fontWeight: 700, letterSpacing: "0.1em",
          }}>
            ← BACK TO TERMINAL
          </Link>
        </div>
      </div>
    </div>
  );
}
