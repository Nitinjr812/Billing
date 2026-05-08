 
export const NAV_ITEMS = [
  { label: "Dashboard",     icon: "⬡" },
  { label: "Inventory",     icon: "◫" },
  { label: "Orders",        icon: "◳" },
  { label: "Customers",     icon: "◉" },
  { label: "Stocks",        icon: "◈" },
  { label: "Notifications", icon: "◎" },
  { label: "Reports",       icon: "◪" },
  { label: "Settings",      icon: "✦" },
];

// ─── LOGO ─────────────────────────────────────────────────────────────────────
export function Logo() {
  return (
    <span
      className="font-black tracking-tight select-none text-2xl"
      style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.04em" }}
    >
      <span className="text-[#f0e6d3]">BIL</span>
      <span className="text-[#f97316]">L</span>
      <span className="text-[#f0e6d3]">LING</span>
    </span>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export function Navbar({ active, setActive, sidebarOpen, setSidebarOpen }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16"
      style={{ background: "#0f0e0c", borderBottom: "1px solid #1e1c19" }}
    >
      {/* Left — Brand */}
      <Logo />

      {/* Center — Nav Links (desktop only) */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.filter((n) => n.label !== "Notifications").map((item) => (
          <button
            key={item.label}
            onClick={() => setActive(item.label)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${
                active === item.label
                  ? "text-[#f97316] bg-[#f9731610]"
                  : "text-[#7a7570] hover:text-[#f0e6d3] hover:bg-[#1a1814]"
              }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right — Bell + Avatar + Hamburger */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="hidden md:flex relative w-9 h-9 items-center justify-center rounded-lg
            text-[#7a7570] hover:text-[#f0e6d3] hover:bg-[#1a1814] transition-all"
          style={{ border: "1px solid #1e1c19" }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f97316]" />
        </button>

        {/* Avatar */}
        <div
          className="hidden md:flex w-9 h-9 rounded-lg items-center justify-center
            text-xs font-bold text-[#0f0e0c] cursor-pointer"
          style={{
            background: "linear-gradient(135deg,#f97316,#fb923c)",
            fontFamily: "'Syne',sans-serif",
          }}
        >
          NK
        </div>

        <button
          className="md:hidden flex flex-col gap-[5px] p-1 cursor-pointer bg-transparent border-none"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span
            className={`block w-5 h-0.5 bg-[#f0e6d3] rounded transition-all duration-200 ${
              sidebarOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[#f0e6d3] rounded transition-all duration-200 ${
              sidebarOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[#f0e6d3] rounded transition-all duration-200 ${
              sidebarOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </div>
    </nav>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({ open, onClose, active, setActive }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col md:hidden"
        style={{
          background: "#0f0e0c",
          borderRight: "1px solid #1e1c19",
          transition: "transform 0.25s ease",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Sidebar Header */}
        <div
          className="flex items-center justify-between px-5 h-16"
          style={{ borderBottom: "1px solid #1e1c19" }}
        >
          <Logo />
          <button
            onClick={onClose}
            className="text-[#7a7570] hover:text-[#f0e6d3] transition-colors bg-transparent border-none cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActive(item.label);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                font-medium transition-all duration-150 text-left bg-transparent border-none cursor-pointer
                ${
                  active === item.label
                    ? "text-[#f97316] bg-[#f9731615]"
                    : "text-[#7a7570] hover:text-[#f0e6d3] hover:bg-[#1a1814]"
                }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer — User Info */}
        <div className="px-4 py-5" style={{ borderTop: "1px solid #1e1c19" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-[#0f0e0c]"
              style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}
            >
              RJ
            </div>
            <div>
              <p
                className="text-sm font-medium text-[#f0e6d3]"
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                Rajyadu Admin
              </p>
              <p className="text-xs text-[#7a7570]">admin@rajyadu.in</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Navbar;