import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../components/ThemeContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";
const TOKEN_KEY = "token"; // ⬅ apne shop-side login ki localStorage key yahan daal

const CATEGORIES = [
  { id: "bug", label: "Bug / Problem" },
  { id: "billing", label: "Billing / Payment" },
  { id: "feature", label: "Feature request" },
  { id: "other", label: "Other" },
];
const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

async function request(path, options = {}) {
  const res = await fetch(`${BACKEND}/api/customer-reports${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 || res.status === 403) throw new Error("Session expire ho gaya, dobara login karo.");
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

const timeAgo = (d) => {
  const m = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`;
  return `${Math.floor(m / 1440)} din pehle`;
};

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 1500;

export default function ReportIssue() {
  const { t } = useTheme();
  const [form, setForm] = useState({ subject: "", message: "", category: "bug", priority: "medium" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "ok" | "err", text }
  const [mine, setMine] = useState(null);
  const [listError, setListError] = useState("");

  const loadMine = useCallback(async () => {
    try {
      setMine(await request("/mine"));
      setListError("");
    } catch (e) {
      setListError(e.message);
      setMine((prev) => prev || []);
    }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!form.subject.trim() || !form.message.trim()) {
      return setFeedback({ type: "err", text: "Subject aur message dono bharo." });
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await request("/", { method: "POST", body: JSON.stringify(form) });
      setMine((prev) => [res.report, ...(prev || [])]);
      setForm({ subject: "", message: "", category: "bug", priority: "medium" });
      setFeedback({ type: "ok", text: "Report bhej di gayi. Hum jaldi dekhenge." });
    } catch (err) {
      setFeedback({ type: "err", text: err.message });
    } finally {
      setSending(false);
    }
  };

  const gradient = `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`;
  const statusColor = { open: t.red, in_progress: t.orange, resolved: t.green };

  const field = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12,
    border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary,
    fontSize: 13.5, fontFamily: "inherit", outline: "none",
  };
  const focus = (e) => { e.currentTarget.style.borderColor = t.accent; };
  const blur = (e) => { e.currentTarget.style.borderColor = t.border; };
  const label = { fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 };

  const chip = (on) => ({
    padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${on ? `${t.accent}60` : t.border}`,
    background: on ? `${t.accent}18` : t.bgCard, color: on ? t.accent : t.textMuted,
  });

  return (
    <div style={{ padding: "24px 16px 48px", maxWidth: 720, margin: "0 auto", color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(22px, 5vw, 28px)", margin: 0, letterSpacing: "-0.02em" }}>
        Report an issue
      </h1>
      <p style={{ fontSize: 13, color: t.textMuted, margin: "6px 0 22px" }}>
        Koi problem ya suggestion hai? Yahan likho, seedha admin tak pahunchega.
      </p>

      <form onSubmit={submit} style={{ borderRadius: 18, border: `1px solid ${t.border}`, background: t.bgCard, padding: "22px 22px 24px" }}>
        <p style={label}>Type</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {CATEGORIES.map((c) => (
            <button type="button" key={c.id} onClick={() => setForm({ ...form, category: c.id })} style={chip(form.category === c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        <p style={label}>Priority</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {PRIORITIES.map((p) => (
            <button type="button" key={p.id} onClick={() => setForm({ ...form, priority: p.id })} style={chip(form.priority === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <label htmlFor="rp-subject" style={label}>Subject</label>
        <input
          id="rp-subject" value={form.subject} maxLength={SUBJECT_MAX}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          onFocus={focus} onBlur={blur} style={{ ...field, marginBottom: 16 }}
          placeholder="e.g. Invoice PDF me GST number missing"
        />

        <label htmlFor="rp-message" style={label}>Details</label>
        <textarea
          id="rp-message" rows={6} value={form.message} maxLength={MESSAGE_MAX}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          onFocus={focus} onBlur={blur} style={{ ...field, resize: "vertical" }}
          placeholder="Kya hua, kab hua, aur kya expect kar rahe the..."
        />
        <p style={{ fontSize: 11, color: t.textMuted, margin: "6px 0 0", textAlign: "right" }}>
          {form.message.length}/{MESSAGE_MAX}
        </p>

        {feedback && (
          <div
            role="status"
            style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 11, fontSize: 13,
              background: feedback.type === "ok" ? t.greenBg : t.redBg,
              border: `1px solid ${feedback.type === "ok" ? t.green : t.red}40`,
              color: feedback.type === "ok" ? t.green : t.red,
            }}
          >
            {feedback.text}
          </div>
        )}

        <button
          type="submit" disabled={sending}
          style={{
            marginTop: 18, padding: "12px 24px", borderRadius: 12, border: "none", background: gradient,
            color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.6 : 1, width: "100%",
          }}
        >
          {sending ? "Sending..." : "Submit report"}
        </button>
      </form>

      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, margin: "32px 0 12px" }}>
        Meri reports
      </h2>

      {listError && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: 11, fontSize: 13, background: t.redBg, border: `1px solid ${t.red}40`, color: t.red, marginBottom: 12 }}>
          {listError}{" "}
          <button onClick={loadMine} style={{ background: "none", border: "none", color: t.red, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {mine === null ? (
        <div style={{ height: 70, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}` }} />
      ) : mine.length === 0 && !listError ? (
        <p style={{ fontSize: 13, color: t.textMuted }}>Abhi tak koi report nahi bheji.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((r) => (
            <div key={r._id} style={{ padding: "14px 16px", borderRadius: 14, border: `1px solid ${t.border}`, background: t.bgCard }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{r.subject}</p>
                <span
                  style={{
                    fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    color: statusColor[r.status], background: `${statusColor[r.status]}1c`,
                  }}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: t.textMuted, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.message}</p>
              {r.reply && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: t.bgPage, borderLeft: `3px solid ${t.accent}`, fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong style={{ color: t.accent }}>Admin reply:</strong> {r.reply}
                </div>
              )}
              <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted }}>
                {r.category} · {r.priority} priority · {timeAgo(r.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}