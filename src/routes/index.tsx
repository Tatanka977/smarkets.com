import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "../LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Strategic Markets" },
      {
        name: "description",
        content: "AI-powered portfolio management and investment platform.",
      },
    ],
  }),
  component: LandingPage,
});
