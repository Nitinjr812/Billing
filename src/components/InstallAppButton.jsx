import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── ICONS (same single-stroke style as the rest of the app) ─────────────
function DownloadIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
function ShareIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
function CloseIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}
function isStandaloneAlready() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// ─── iOS INSTRUCTIONS POPOVER — Safari doesn't support the native
// install prompt, so we show the manual steps instead ─────────────────
function IosInstallHelp({ onClose, t }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 1300, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
          padding: 22, width: "100%", maxWidth: 380,
          display: "flex", flexDirection: "column", gap: 14,
          animation: "modalIn 0.2s ease", marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 17, color: t.textPrimary, margin: 0 }}>
            Install kaise karein
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 8, background: `${t.accent}12`,
              border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          ><CloseIcon size={12} /></button>
        </div>
        {[
          ["1", "Neeche Safari ke Share button (box + upar arrow) pe tap karo"],
          ["2", "List mein 'Add to Home Screen' dhundo aur dabao"],
          ["3", "'Add' pe tap karo — icon home screen pe aa jaayega"],
        ].map(([n, text]) => (
          <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: `${t.accent}15`, color: t.accent, fontWeight: 700, fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans', sans-serif",
            }}>{n}</span>
            <p style={{ fontSize: 13, color: t.textPrimary, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INSTALL APP BUTTON ────────────────────────────────────────────────
// Drop this anywhere in your header/nav. It stays invisible until the
// browser says the app is actually installable, and disappears again
// once installed — so it never shows a dead-end button.
const SIZES = {
  md: { padding: "10px 16px", fontSize: "13px", iconSize: 14, radius: "10px", gap: "6px" },
  sm: { padding: "6px 10px", fontSize: "11px", iconSize: 11, radius: "8px", gap: "4px" },
};

export default function InstallAppButton({ style = {}, size = "md" }) {
  const { t } = useTheme();
  const s = SIZES[size] || SIZES.md;
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);

  useEffect(() => {
    if (isStandaloneAlready()) {
      setInstalled(true);
      return;
    }
    if (isIos()) {
      setIosEligible(true); // Safari never fires beforeinstallprompt
    }

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // Nothing to offer: already installed, or the browser hasn't (yet)
  // signalled installability and it isn't iOS Safari either.
  if (installed || (!deferredPrompt && !iosEligible)) return null;

  return (
    <>
      {showIosHelp && <IosInstallHelp onClose={() => setShowIosHelp(false)} t={t} />}
      <button
        onClick={handleInstall}
        style={{
          display: "flex", alignItems: "center", gap: s.gap,
          padding: s.padding, borderRadius: s.radius,
          background: t.accent, color: "#fff", border: "none",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: s.fontSize,
          cursor: "pointer", touchAction: "manipulation", whiteSpace: "nowrap",
          ...style,
        }}
      >
        {isIos() ? <ShareIcon size={s.iconSize} /> : <DownloadIcon size={s.iconSize} />}
        {size === "sm" ? "Install" : "Install App"}
      </button>
    </>
  );
}