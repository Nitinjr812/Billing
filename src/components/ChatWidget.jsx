import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function ChatWidget() {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Stock, orders, revenue — kuch bhi pucho 👋" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Kuch gadbad ho gayi, dobara try karo." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Server se connect nahi ho paya. Backend chal raha hai check karo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[90vw] h-[480px] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <span className="text-lg">🤖</span>
            <h3
              className="font-black text-sm"
              style={{ fontFamily: "'Syne',sans-serif", color: t.textPrimary }}
            >
              Inventory Assistant
            </h3>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap"
                  style={{
                    background: m.role === "user" ? t.textPrimary : t.bgPage,
                    color: m.role === "user" ? t.bgCard : t.textPrimary,
                    border: m.role === "assistant" ? `1px solid ${t.border}` : "none",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ background: t.bgPage, color: t.textMuted, border: `1px solid ${t.border}` }}
                >
                  Type kar raha hai...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${t.border}` }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Kuch bhi pucho..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: t.bgPage, color: t.textPrimary, border: `1px solid ${t.border}` }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: t.textPrimary, color: t.bgCard }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}