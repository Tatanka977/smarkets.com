// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Force-enable the Nitro deploy plugin outside the Lovable sandbox too.
  // Without this, production builds (e.g. on Netlify) skip server bundling
  // entirely and only produce a client-only build, breaking SSR/server functions.
  // Nitro auto-detects the Netlify build environment and picks the right preset.
  nitro: true,
  tanstackStart: {
    server: { entry: "server" },
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
