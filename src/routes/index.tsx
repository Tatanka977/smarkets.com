import { createFileRoute } from "@tanstack/react-router";
import PortfolioTerminal from "@/components/PortfolioTerminal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Strategic Markets — Portfolio Terminal" },
      { name: "description", content: "Strategic Markets: portfolio terminal with multi-asset coverage and AI advisor." },
      { property: "og:title", content: "Strategic Markets — Portfolio Terminal" },
      { property: "og:description", content: "Strategic Markets: portfolio terminal with multi-asset coverage and AI advisor." },
    ],
  }),
  component: PortfolioTerminal,
});
