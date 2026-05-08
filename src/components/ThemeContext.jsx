import { createContext, useContext, useState } from "react";

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
export const themes = {
  dark: {
    // Backgrounds
    bg:          "#0f0e0c",
    bgPage:      "#100f0d",
    bgCard:      "#141210",
    bgHover:     "#1a1814",
    bgActive:    "#f9731610",

    // Borders
    border:      "#1e1c19",
    borderLight: "#1a1814",

    // Text
    textPrimary: "#f0e6d3",
    textMuted:   "#7a7570",

    // Accent
    accent:      "#f97316",
    accentLight: "#fb923c",

    // Status
    green:  "#22c55e",
    greenBg:"#22c55e18",
    red:    "#ef4444",
    redBg:  "#ef444418",
    orange: "#f97316",
    orangeBg:"#f9731618",
    blue:   "#3b82f6",
    blueBg: "#3b82f618",

    // Chart
    gridColor:   "#1a1814",
    tooltipBg:   "#1a1814",
    tooltipBorder:"#2a2620",
    tooltipTitle:"#f0e6d3",
    tooltipBody: "#7a7570",
  },
  light: {
    // Backgrounds
    bg:          "#fffdf8",
    bgPage:      "#f5f0e8",
    bgCard:      "#fffdf8",
    bgHover:     "#f0ebe0",
    bgActive:    "#ea580c12",

    // Borders
    border:      "#e5dfd4",
    borderLight: "#f0ebe0",

    // Text
    textPrimary: "#1a1410",
    textMuted:   "#8a8278",

    // Accent
    accent:      "#ea580c",
    accentLight: "#f97316",

    // Status
    green:  "#16a34a",
    greenBg:"#16a34a18",
    red:    "#dc2626",
    redBg:  "#dc262618",
    orange: "#ea580c",
    orangeBg:"#ea580c18",
    blue:   "#2563eb",
    blueBg: "#2563eb18",

    // Chart
    gridColor:   "#f0ebe0",
    tooltipBg:   "#fffdf8",
    tooltipBorder:"#e5dfd4",
    tooltipTitle:"#1a1410",
    tooltipBody: "#8a8278",
  },
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark"); // "dark" | "light"
  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));
  const t = themes[mode];

  return (
    <ThemeContext.Provider value={{ mode, toggle, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export default ThemeContext;