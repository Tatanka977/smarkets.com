import { createFileRoute } from "@tanstack/react-router";
import PortfolioTerminal from "@/components/PortfolioTerminal";

export const Route = createFileRoute("/terminal")({
  component: PortfolioTerminal,
});
