import { useState, useEffect, useCallback } from "react";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";
import { useTheme } from "../components/ThemeContext";

const FILTERS = ["pending", "approved", "rejected"];

export default function SuperAdminApprovals() {
  const { api } = useSuperAdminAuth();
  const { toast, confirmAction, promptInput } = useSuperAdminUI();
  const { t } = useTheme();
  const [filter, setFilter] = useState("pending");
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [zoom, setZoom] = useState(null);

  const load = useCallback(async () => {
    setList(null);
    setError("");
    try { setList(await api(`/verifications?status=${filter}`)); }
    catch (e) { setError(e.message); setList([]); }
  }, [api, filter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (shop, decision) => {
    let reason = "";
    if (decision === "reject") {
      const r = await promptInput({
        title: `Reject "${shop.shopName}"?`,
        description: "The owner will see this reason and can resubmit.",
        confirmLabel: "Reject",
        fields: [{ key: "reason", label: "Reason", placeholder: "e.g. Photos are unclear / GSTIN mismatch" }],
      });
      if (r === null) return;
      reason = r.reason;
    } else {
      const ok = await confirmAction({
        title: `Approve "${shop.shopName}"?`,
        message: "The shop will get full access to the billing app.",
        confirmLabel: "Approve",
      });
      if (!ok) return;
    }
    setBusyId(shop.shopId);
    try {
      await api(`/verifications/${shop.shopId}`, { method: "PATCH", body: JSON.stringify({ decision, reason }) });
      toast.success(`${shop.shopName} ${decision === "approve" ? "approved" : "rejected"}.`);
      setList((prev) => (prev || []).filter((s) => s.shopId !== shop.shopId));
    } catch (e) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const chip = (on) => ({
    padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
    border: `1px solid ${on ? `${t.accent}60` : t.border}`, background: on ? `${t.accent}18` : t.bgCard, color: on ? t.accent : t.textMuted,
  });
  const actionBtn = (color) => ({
    padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${color}60`, background: `${color}18`, color,
  });

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f}</button>)}
      </div>

      {error && (
        <div role="alert" style={{ padding: "12px 16px", borderRadius: 12, background: t.redBg, border: `1px solid ${t.red}40`, color: t.red, fontSize: 13, marginBottom: 14 }}>
          {error} <button onClick={load} style={{ background: "none", border: "none", color: t.red, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {list === null ? (
        <div style={{ height: 120, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}` }} />
      ) : list.length === 0 && !error ? (
        <p style={{ textAlign: "center", padding: "48px 0", color: t.textMuted, fontSize: 13 }}>No {filter} requests.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map((s) => (
            <div key={s.shopId} style={{ padding: 18, borderRadius: 18, border: `1px solid ${t.border}`, background: t.bgCard }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16 }}>{s.shopName}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: t.textMuted }}>
                    {s.shopId} · {s.ownerName} ({s.ownerEmail})
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: t.textMuted }}>
                  Submitted {new Date(s.submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div style={{ margin: "14px 0", fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}><strong>GSTIN:</strong> {s.gstin || <span style={{ color: t.textMuted }}>Not provided</span>}</p>
                <p style={{ margin: "4px 0 0" }}><strong>Address:</strong> {s.address}</p>
                {s.status === "rejected" && s.rejectReason && (
                  <p style={{ margin: "4px 0 0", color: t.red }}><strong>Rejected:</strong> {s.rejectReason}</p>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {s.photos.map((src, i) => (
                  <button key={i} onClick={() => setZoom(src)} aria-label={`Open photo ${i + 1}`}
                    style={{ padding: 0, width: 110, height: 110, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.border}`, cursor: "zoom-in", background: "none" }}>
                    <img src={src} alt={`Shop photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>

              {s.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 16, opacity: busyId === s.shopId ? 0.5 : 1, pointerEvents: busyId === s.shopId ? "none" : "auto" }}>
                  <button onClick={() => decide(s, "approve")} style={actionBtn(t.green)}>Approve</button>
                  <button onClick={() => decide(s, "reject")} style={actionBtn(t.red)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={zoom} alt="Shop photo enlarged" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}