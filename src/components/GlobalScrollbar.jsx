import { useEffect } from "react";
import { useTheme } from "../components/ThemeContext";

/**
 * GlobalScrollbar — mount this ONCE near the root of your app
 * (e.g. in App.jsx, right alongside your theme provider) and every
 * scrollbar on every page/component automatically picks up your
 * dashboard's theme colors — including light/dark switches, since
 * it re-runs whenever `t` changes.
 *
 * Usage (in App.jsx):
 *   import GlobalScrollbar from "./components/GlobalScrollbar";
 *   ...
 *   <ThemeProvider>
 *     <GlobalScrollbar />
 *     <YourRoutes />
 *   </ThemeProvider>
 *
 * It renders nothing visible — it just injects the CSS + syncs
 * CSS variables to the current theme on every render.
 */
export default function GlobalScrollbar() {
  const { t } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--scrollbar-track", `${t.border}30`);
    root.style.setProperty("--scrollbar-thumb", `${t.accent}55`);
    root.style.setProperty("--scrollbar-thumb-hover", t.accent);
    root.style.setProperty("--scrollbar-thumb-border", t.bgCard);
    // Firefox shorthand needs solid-ish values, soft accent works well
    root.style.setProperty("--scrollbar-thumb-firefox", `${t.accent}70`);
  }, [t]);

  return (
    <style>{`
      /* ── Firefox ─────────────────────────────────────────────── */
      * {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-firefox) var(--scrollbar-track);
      }

      /* ── WebKit (Chrome, Safari, Edge, Opera) — applies everywhere ── */
      *::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      *::-webkit-scrollbar-track {
        background: var(--scrollbar-track);
        border-radius: 99px;
      }

      *::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 99px;
        border: 2px solid var(--scrollbar-thumb-border);
        background-clip: padding-box;
        transition: background 0.2s ease;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover);
        background-clip: padding-box;
      }

      *::-webkit-scrollbar-corner {
        background: transparent;
      }

      /* thin variant for tight spaces — add className="dash-scroll-thin"
         to any scroll container (e.g. the AI chat message list) */
      .dash-scroll-thin::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      @media (prefers-reduced-motion: reduce) {
        *::-webkit-scrollbar-thumb { transition: none !important; }
      }
    `}</style>
  );
}