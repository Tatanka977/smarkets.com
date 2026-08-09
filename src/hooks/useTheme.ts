import { useEffect } from "react";

// Light theme removed — the app is dark-only now. Kept as a hook (not
// deleted outright) purely so every existing call site
// (`const [theme, , toggleTheme] = useTheme()`) keeps compiling
// unchanged; theme/setTheme/toggle are now inert stand-ins. If a caller
// still renders a toggle button around this, it just won't do anything
// visible — themed-based UI elsewhere all fell back to "terminal"
// automatically since that's the only value this ever returns now.
export type SMTheme = "terminal";

export function useTheme(): [SMTheme, (t: SMTheme) => void, () => void] {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", "terminal");
    }
  }, []);

  const noop = () => {};

  return ["terminal", noop, noop];
}
