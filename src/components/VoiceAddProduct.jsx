import { useState, useRef } from "react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "../context/AuthContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

export default function VoiceAddProduct({ onProductAdded }) {
    const { t } = useTheme();
    const { token } = useAuth();

    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [parsed, setParsed] = useState(null); // review screen ke liye
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const recognitionRef = useRef(null);

    const isSupported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

    const startListening = () => {
        setError("");
        setParsed(null);
        setTranscript("");

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "hi-IN"; // Hindi + Hinglish + English sab kaafi accurately pakadta hai
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setListening(true);

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            parseTranscript(text);
        };

        recognition.onerror = (event) => {
            setListening(false);
            setError(`Mic error: ${event.error}. Please try again or check mic permissions.`);
        };

        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
    };

    const parseTranscript = async (text) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${BACKEND}/api/voice-product/parse`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse");
            setParsed(data.parsed);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${BACKEND}/api/voice-product/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(parsed),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            setParsed(null);
            setTranscript("");
            onProductAdded?.(); // parent ko batao list refresh karne ke liye
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (key) => (e) => {
        const val = e.target.value;
        setParsed((p) => ({ ...p, [key]: ["price", "costPrice", "stock"].includes(key) ? Number(val) : val }));
    };

    if (!isSupported) {
        return (
            <div style={{ padding: 12, borderRadius: 10, background: `${t.orange}15`, fontSize: 12, color: t.orange }}>
                ⚠️ Voice input is not supported in this browser. Try Chrome or Edge.
            </div>
        );
    }

    return (
        <div style={{
            borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
            padding: 20, display: "flex", flexDirection: "column", gap: 14,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                    onClick={startListening}
                    disabled={listening || loading}
                    style={{
                        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                        background: listening ? t.red : t.accent, border: "none",
                        color: "#fff", fontSize: 22, cursor: listening ? "not-allowed" : "pointer",
                        animation: listening ? "pulse 1.2s infinite" : "none",
                    }}
                >
                    🎤
                </button>
                <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: t.textPrimary, margin: 0 }}>
                        {listening ? "Listening..." : "Speak to Add Product"}
                    </p>
                    <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>
                        e.g. "Samsung TV add karo price 25000 stock 10 electronics"
                    </p>
                </div>
            </div>

            {loading && !parsed && (
                <p style={{ fontSize: 12, color: t.textMuted }}>🤖 Understanding what you said...</p>
            )}

            {error && (
                <p style={{ fontSize: 12, color: t.red, background: `${t.red}12`, padding: "8px 12px", borderRadius: 8 }}>
                    {error}
                </p>
            )}

            {transcript && !parsed && !loading && (
                <p style={{ fontSize: 12, color: t.textMuted, fontStyle: "italic" }}>You said: "{transcript}"</p>
            )}

            {/* ── Review / Confirm screen ── */}
            {parsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Review before saving
                    </p>

                    {[
                        ["Product Name", "name", "text"],
                        ["Selling Price (₹)", "price", "number"],
                        ["Cost Price (₹)", "costPrice", "number"],
                        ["Stock Quantity", "stock", "number"],
                    ].map(([label, key, type]) => (
                        <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                            <input
                                type={type}
                                value={parsed[key] ?? ""}
                                onChange={updateField(key)}
                                style={{
                                    padding: "8px 12px", borderRadius: 8, border: `1px solid ${parsed[key] == null ? t.red : t.border}`,
                                    background: t.bgPage, color: t.textPrimary, fontSize: 13, outline: "none",
                                }}
                            />
                        </div>
                    ))}

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
                        <select
                            value={parsed.category}
                            onChange={updateField("category")}
                            style={{
                                padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
                                background: t.bgPage, color: t.textPrimary, fontSize: 13, outline: "none",
                            }}
                        >
                            {["Electronics", "Apparel", "Home Goods"].map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button
                            onClick={() => { setParsed(null); setTranscript(""); }}
                            style={{
                                flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${t.border}`,
                                background: "transparent", color: t.textMuted, fontWeight: 600, fontSize: 12, cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading || !parsed.name || parsed.price == null || parsed.stock == null}
                            style={{
                                flex: 1, padding: "9px", borderRadius: 8, border: "none",
                                background: t.accent, color: "#fff", fontWeight: 700, fontSize: 12,
                                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? "Saving..." : "✅ Confirm & Add"}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${t.red}66; }
          50% { box-shadow: 0 0 0 10px ${t.red}00; }
        }
      `}</style>
        </div>
    );
}