 

import { useState, useEffect } from "react";
import { Navbar, Sidebar, NAV_ITEMS } from "./components/Navbar";
import Dashboard from "../src/pages/Dashboard"; 
function PlaceholderPage({ name }) {
  const icon = NAV_ITEMS.find((n) => n.label === name)?.icon ?? "◦";
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: "#1a1814", border: "1px solid #2a2620" }}
      >
        {icon}
      </div>
      <h2
        className="text-2xl font-black text-[#f0e6d3]"
        style={{ fontFamily: "'Syne',sans-serif" }}
      >
        {name}
      </h2>
      <p className="text-sm text-[#7a7570]">This section is coming soon.</p>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar when screen hits desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0f0e0c" }}>

      {/* ── Navbar ── */}
      <Navbar
        active={active}
        setActive={setActive}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* ── Mobile Sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active={active}
        setActive={setActive}
      />

      {/* ── Page Content ── */}
      <main className="pt-20 px-4 md:px-8 pb-10 max-w-7xl mx-auto">
        {active === "Dashboard" ? (
          <Dashboard />
        ) : (
          <PlaceholderPage name={active} />
        )}
      </main>

    </div>
  );
}