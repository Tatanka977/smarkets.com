// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Force-pin Nitro's preset to Vercel for production builds.
  // According to the @lovable.dev/vite-tanstack-config typings:
  //   - Inside a Lovable/Emergent sandbox build the preset is force-forced to
  //     Cloudflare, so this override is ignored (the preview here keeps working).
  //   - Outside the sandbox (Vercel's CI build) this override is honored and
  //     Nitro emits Vercel-compatible output (`.vercel/output`).
  // NITRO_PRESET env var (if set on the Vercel project) still takes precedence.
  nitro: {
    preset: "vercel",
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      // Disable HMR entirely. The preview is served behind a Cloudflare/ingress proxy
      // that closes idle WebSockets after ~50s; Vite's HMR then forces a full
      // browser reload (which wipes UI state and infuriates the user).
      // Without HMR the dev server still serves files normally; users just
      // refresh manually to pull new changes.
      hmr: false,
    },
  },
});
