import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";

const PRIORITY_STYLES = {
  low:    { color: "#16a34a", bg: "#dcfce7", label: "Low" },
  medium: { color: "#d97706", bg: "#fef3c7", label: "Medium" },
  high:   { color: "#dc2626", bg: "#fee2e2", label: "High" },
};

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(deadline, status) {
  if (!deadline || status === "done") return false;
  return new Date(deadline) < new Date();
}

export default function Tasks() {
  const { t } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const isOwner = user?.role === "owner";

  const [tasks, setTasks] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ title: "", description: "", deadline: "", priority: "medium", assignedTo: "" });
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const loadTasks = () => api("/tasks").then(setTasks).catch((e) => setMsg("❌ " + e.message));

  useEffect(() => {
    loadTasks();
    if (isOwner) {
      api("/settings/team")
        .then((members) => setStaff(members.filter((m) => m.role !== "owner")))
        .catch(() => {});
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.assignedTo) return setMsg("❌ Title aur employee dono chahiye");
    setSaving(true);
    try {
      await api("/tasks", { method: "POST", body: JSON.stringify(form) });
      setMsg("✅ Task assign ho gaya!");
      setForm({ title: "", description: "", deadline: "", priority: "medium", assignedTo: "" });
      setShowForm(false);
      loadTasks();
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    setCompletingId(id);
    try {
      await api(`/tasks/${id}/complete`, { method: "PATCH" });
      loadTasks();
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setCompletingId(null);
    }
  };

  const pending = (tasks || []).filter((tk) => tk.status === "pending");
  const done = (tasks || []).filter((tk) => tk.status === "done");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em" }}>
            Tasks
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
            {isOwner ? "Team ko tasks assign kar aur track kar" : "Tere assign kiye gaye tasks"}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >{showForm ? "Cancel" : "+ Assign New Task"}</button>
        )}
      </div>

      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, fontSize: 13,
          background: msg.startsWith("❌") ? "#fee2e2" : "#dcfce7",
          color: msg.startsWith("❌") ? "#dc2626" : "#16a34a",
        }}>{msg}</div>
      )}

      {/* ── Assign form ── */}
      {isOwner && showForm && (
        <form onSubmit={handleCreate} style={{
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 22,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle(t)}>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Count evening stock"
                style={inputStyle(t)}
                required
              />
            </div>
            <div>
              <label style={labelStyle(t)}>Assign To</label>
              <select
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                style={inputStyle(t)}
                required
              >
                <option value="">Select employee</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle(t)}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Task details..."
              rows={3}
              style={{ ...inputStyle(t), resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle(t)}>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                style={inputStyle(t)}
              />
            </div>
            <div>
              <label style={labelStyle(t)}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                style={inputStyle(t)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} style={{
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}>{saving ? "Assigning..." : "Assign Task"}</button>
          </div>
        </form>
      )}

      {/* ── Pending tasks ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Pending ({pending.length})
        </p>
        {tasks === null ? (
          <p style={{ fontSize: 13, color: t.textMuted }}>Loading...</p>
        ) : pending.length === 0 ? (
          <p style={{ fontSize: 13, color: t.textMuted }}>Koi pending task nahi hai.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((tk) => (
              <TaskCard key={tk._id} task={tk} t={t} isOwner={isOwner}
                onComplete={() => handleComplete(tk._id)} completing={completingId === tk._id} />
            ))}
          </div>
        )}
      </div>

      {/* ── Completed tasks ── */}
      {done.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Completed ({done.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {done.map((tk) => (
              <TaskCard key={tk._id} task={tk} t={t} isOwner={isOwner} completed />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, t, isOwner, onComplete, completing, completed }) {
  const pr = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${overdue ? "#dc2626" : t.border}`,
      borderRadius: 14, padding: "16px 20px", opacity: completed ? 0.7 : 1,
      display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
        background: completed ? "#16a34a" : pr.color,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700,
            color: t.textPrimary, textDecoration: completed ? "line-through" : "none",
          }}>{task.title}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            color: pr.color, background: pr.bg, textTransform: "uppercase",
          }}>{pr.label}</span>
          {overdue && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: "#dc2626", background: "#fee2e2" }}>
              OVERDUE
            </span>
          )}
        </div>
        {task.description && (
          <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 6, lineHeight: 1.5 }}>{task.description}</p>
        )}
        <p style={{ fontSize: 11, color: t.textMuted }}>
          {isOwner && task.assignedTo && <>Assigned to <b>{task.assignedTo.name}</b> · </>}
          {!isOwner && task.assignedBy && <>From <b>{task.assignedBy.name}</b> · </>}
          {task.deadline && <>Due {fmtDate(task.deadline)}</>}
          {completed && task.completedAt && <> · Completed {fmtDate(task.completedAt)}</>}
        </p>
      </div>
      {!completed && !isOwner && (
        <button
          onClick={onComplete}
          disabled={completing}
          style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${t.accent}`, color: t.accent, background: `${t.accent}10`,
            cursor: completing ? "not-allowed" : "pointer", flexShrink: 0,
          }}
        >{completing ? "..." : "Mark Done"}</button>
      )}
    </div>
  );
}

function labelStyle(t) {
  return { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6 };
}

function inputStyle(t) {
  return {
    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${t.border}`, background: `${t.accent}08`, color: t.textPrimary,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
  };
}