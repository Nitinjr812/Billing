import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";
const TOKEN_KEY = "token"; // same key you used in ReportIssue.jsx
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const MAX_PHOTOS = 3;

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

async function request(path, options = {}) {
  const res = await fetch(`${BACKEND}/api/shop-verification${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 || res.status === 403) throw new Error("Session expired. Please log in again.");
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

// Resize + compress to JPEG so uploads stay small
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image file")); };
    img.src = url;
  });

/* ═════════ Verification form (used in signup + after rejection) ═════════ */
export default function ShopVerificationForm({ onDone, compact = false }) {
  const { t } = useTheme();
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const addFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = "";
    if (files.length === 0) return;
    setError("");
    try {
      const out = [];
      for (const f of files) {
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed");
        out.push(await compressImage(f));
      }
      setPhotos((p) => [...p, ...out].slice(0, MAX_PHOTOS));
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const g = gstin.trim().toUpperCase();
    if (g && !GSTIN_RE.test(g)) return setError("Enter a valid 15-character GSTIN (e.g. 08ABCDE1234F1Z5).");
    if (address.trim().length < 10) return setError("Please enter the complete shop address.");
    if (photos.length < 1) return setError("Upload at least 1 photo of your shop.");
    setBusy(true);
    setError("");
    try {
      await request("/", { method: "POST", body: JSON.stringify({ gstin: g, address: address.trim(), photos }) });
      onDone?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const field = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12,
    border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary,
    fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", outline: "none",
  };
  const focus = (e) => { e.currentTarget.style.borderColor = t.accent; };
  const blur = (e) => { e.currentTarget.style.borderColor = t.border; };
  const label = { fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!compact && (
        <>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: t.textPrimary, margin: 0 }}>
            Verify your shop
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textMuted, margin: "-8px 0 4px" }}>
            Our team reviews every new shop before activating it. This usually takes a short while.
          </p>
        </>
      )}

      <div>
        <label htmlFor="sv-gstin" style={label}>GSTIN <span style={{ fontWeight: 400 }}>(optional)</span></label>
        <input id="sv-gstin" value={gstin} maxLength={15} placeholder="08ABCDE1234F1Z5"
          onChange={(e) => setGstin(e.target.value.toUpperCase())} onFocus={focus} onBlur={blur}
          style={{ ...field, letterSpacing: "0.04em" }} />
      </div>

      <div>
        <label htmlFor="sv-address" style={label}>Shop address</label>
        <textarea id="sv-address" rows={3} value={address} placeholder="Shop no., street, area, city, PIN code"
          onChange={(e) => setAddress(e.target.value)} onFocus={focus} onBlur={blur}
          style={{ ...field, resize: "vertical" }} />
      </div>

      <div>
        <span style={label}>Shop photos ({photos.length}/{MAX_PHOTOS}) — storefront, signboard, inside</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: `1px solid ${t.border}` }}>
              <img src={src} alt={`Shop photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 99, border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ aspectRatio: "1", borderRadius: 12, border: `1.5px dashed ${t.border}`, background: t.bgPage, color: t.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              + Add photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />
      </div>

      {error && (
        <p role="alert" style={{ color: t.red, fontSize: 12, margin: 0, background: t.red + "14", border: `1px solid ${t.red}33`, borderRadius: 8, padding: "8px 12px" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy}
        style={{ padding: "13px 24px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Submitting..." : "Submit for approval"}
      </button>
    </form>
  );
}

/* ═════════ Gate: wrap your protected routes with this ═════════ */
export function ApprovalGate({ children }) {
  const { t } = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, status: null, rejectReason: "", error: "" });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const d = await request("/status");
      setState({ loading: false, status: d.status, rejectReason: d.rejectReason || "", error: "" });
    } catch (e) {
      setState({ loading: false, status: null, rejectReason: "", error: e.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.status === "approved") return children;

  const logout = () => { auth?.logout?.(); navigate("/login"); };
  const card = { maxWidth: 520, margin: "0 auto", padding: 28, borderRadius: 20, border: `1px solid ${t.border}`, background: t.bgCard };
  const btn = { padding: "10px 18px", borderRadius: 11, border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", padding: "48px 16px", background: t.bgPage, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={card}>
        {state.loading && <p style={{ margin: 0, color: t.textMuted }}>Checking your shop status...</p>}

        {!state.loading && state.error && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif", margin: "0 0 8px" }}>Could not load status</h2>
            <p style={{ color: t.red, fontSize: 13 }}>{state.error}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={load} style={btn}>Retry</button>
              <button onClick={logout} style={btn}>Log out</button>
            </div>
          </>
        )}

        {!state.loading && state.status === "pending" && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif", margin: "0 0 8px" }}>Approval pending</h2>
            <p style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.6 }}>
              Your shop details have been submitted. Our team is reviewing them. You will get access as soon as the shop is approved.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={load} style={btn}>Check status</button>
              <button onClick={logout} style={btn}>Log out</button>
            </div>
          </>
        )}

        {!state.loading && state.status === "rejected" && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif", margin: "0 0 8px" }}>Verification rejected</h2>
            <p style={{ fontSize: 13.5, color: t.red, margin: "0 0 4px" }}>
              Reason: {state.rejectReason || "Details could not be verified."}
            </p>
            <p style={{ fontSize: 13, color: t.textMuted, margin: "0 0 18px" }}>Please correct your details and submit again.</p>
            <ShopVerificationForm compact onDone={load} />
            <button onClick={logout} style={{ ...btn, marginTop: 12 }}>Log out</button>
          </>
        )}
      </div>
    </div>
  );
}