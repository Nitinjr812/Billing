import { createContext, useContext, useState, useCallback, useRef } from "react";

const SuperAdminUIContext = createContext(null);

export function SuperAdminUIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const showToast = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const toast = {
    success: (msg) => showToast("success", msg),
    error: (msg) => showToast("error", msg),
    info: (msg) => showToast("info", msg),
  };

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const confirmAction = useCallback(({ title, message, confirmLabel = "Confirm", danger = false }) => {
    return new Promise((resolve) => {
      setDialog({ kind: "confirm", title, message, confirmLabel, danger, resolve });
    });
  }, []);

  const promptInput = useCallback(({ title, description, fields, confirmLabel = "Submit" }) => {
    return new Promise((resolve) => {
      setDialog({ kind: "form", title, description, fields, confirmLabel, resolve });
    });
  }, []);

  const closeDialog = (result) => {
    dialog?.resolve?.(result);
    setDialog(null);
  };

  return (
    <SuperAdminUIContext.Provider value={{ toast, confirmAction, promptInput }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {dialog && <DialogRenderer dialog={dialog} onClose={closeDialog} />}
      <style>{`
        @keyframes sa-toast-in { from { opacity:0; transform: translateY(10px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes sa-toast-out { from { opacity:1; transform: translateX(0); } to { opacity:0; transform: translateX(40px); } }
        @keyframes sa-dialog-in { from { opacity:0; transform: scale(0.94) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes sa-overlay-in { from { opacity:0; } to { opacity:1; } }
        @keyframes sa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </SuperAdminUIContext.Provider>
  );
}

export function useSuperAdminUI() {
  const ctx = useContext(SuperAdminUIContext);
  if (!ctx) throw new Error("useSuperAdminUI must be used within SuperAdminUIProvider");
  return ctx;
}

// ─── TOAST STACK ──────────────────────────────────────────────────────
function ToastStack({ toasts, onDismiss }) {
  const ICONS = {
    success: { glyph: "✓", color: "#4ade80", glow: "rgba(74,222,128,0.25)" },
    error:   { glyph: "!", color: "#f87171", glow: "rgba(248,113,113,0.25)" },
    info:    { glyph: "i", color: "#60a5fa", glow: "rgba(96,165,250,0.25)" },
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 300,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 340,
    }}>
      {toasts.map((t) => {
        const conf = ICONS[t.type] || ICONS.info;
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", borderRadius: 14,
            background: "rgba(21,21,31,0.92)", backdropFilter: "blur(12px)",
            border: `1px solid ${conf.color}33`,
            boxShadow: `0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px ${conf.glow}`,
            animation: "sa-toast-in 0.28s cubic-bezier(.4,0,.2,1)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: `${conf.color}22`, color: conf.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900,
            }}>{conf.glyph}</div>
            <p style={{ flex: 1, fontSize: 12.5, color: "#e4e4ef", lineHeight: 1.4, marginTop: 2 }}>{t.message}</p>
            <button onClick={() => onDismiss(t.id)} style={{
              background: "none", border: "none", color: "#6b6b80", cursor: "pointer", fontSize: 13, padding: 0,
            }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── DIALOG RENDERER ──────────────────────────────────────────────────
function DialogRenderer({ dialog, onClose }) {
  return (
    <div
      onClick={() => onClose(dialog.kind === "confirm" ? false : null)}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(5,5,10,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        animation: "sa-overlay-in 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400, maxWidth: "100%", borderRadius: 20,
          background: "linear-gradient(180deg, #17171f 0%, #131319 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          padding: 24, fontFamily: "'DM Sans', sans-serif",
          animation: "sa-dialog-in 0.22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {dialog.kind === "confirm" ? (
          <ConfirmBody dialog={dialog} onClose={onClose} />
        ) : (
          <FormBody dialog={dialog} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ConfirmBody({ dialog, onClose }) {
  return (
    <>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: "#fff", marginBottom: 8 }}>
        {dialog.title}
      </h3>
      <p style={{ fontSize: 13, color: "#9999ad", lineHeight: 1.5, marginBottom: 22 }}>{dialog.message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => onClose(false)} style={btnGhost}>Cancel</button>
        <button
          onClick={() => onClose(true)}
          style={dialog.danger ? btnDanger : btnPrimary}
        >{dialog.confirmLabel}</button>
      </div>
    </>
  );
}

function FormBody({ dialog, onClose }) {
  const [values, setValues] = useState(() => {
    const init = {};
    dialog.fields.forEach((f) => { init[f.key] = f.defaultValue ?? ""; });
    return init;
  });

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const canSubmit = dialog.fields.every((f) => !f.required || String(values[f.key] ?? "").trim().length > 0);

  return (
    <>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: "#fff", marginBottom: 6 }}>
        {dialog.title}
      </h3>
      {dialog.description && (
        <p style={{ fontSize: 12.5, color: "#9999ad", lineHeight: 1.5, marginBottom: 16 }}>{dialog.description}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {dialog.fields.map((f) => (
          <div key={f.key}>
            {f.label && (
              <label style={{ fontSize: 10.5, fontWeight: 700, color: "#8888a0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                {f.label}
              </label>
            )}
            {f.type === "textarea" ? (
              <textarea
                value={values[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
              />
            ) : (
              <input
                type={f.type || "text"}
                value={values[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => onClose(null)} style={btnGhost}>Cancel</button>
        <button
          onClick={() => canSubmit && onClose(values)}
          disabled={!canSubmit}
          style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >{dialog.confirmLabel}</button>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
  color: "#fff", fontSize: 13, outline: "none",
};

const btnGhost = {
  padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
  border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9999ad", cursor: "pointer",
};

const btnPrimary = {
  padding: "8px 18px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer",
};

const btnDanger = {
  padding: "8px 18px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  border: "none", background: "linear-gradient(135deg,#ef4444,#f87171)", color: "#fff", cursor: "pointer",
};
