import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/LandingPage";

const TITLE = "Portfolio Analysis & Risk Simulator — Strategic Markets";
const DESCRIPTION = "Simulate a multi-asset portfolio with live market data, run in-depth risk analysis, and chat with an AI assistant to learn as you go — free to start.";

// Organization + SoftwareApplication structured data (schema.org). Kept
// honest to what the app actually offers today: a free tier with no paid
// tier live yet (see /pricing), so this is the only "offers" entry —
// nothing here should ever claim a feature that isn't actually shipped.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Strategic Markets",
      url: "https://s-markets.com",
      logo: "https://s-markets.com/sm-icon.png",
    },
    {
      "@type": "SoftwareApplication",
      name: "Strategic Markets",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      url: "https://s-markets.com",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: "https://s-markets.com/" },
    ],
  }),
  component: HomeWithSchema,
});

// Rendered directly in JSX (not via head()'s `scripts`) so the JSON-LD
// tag doesn't depend on that head-API surface being wired up for inline
// script injection — a plain <script> tag always works regardless.
function HomeWithSchema() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <LandingPage />
    </>
  );
}
